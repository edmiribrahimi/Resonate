---
phase: 45-production-sections-section-by-section
plan: 09
subsystem: access-gating / supabase-data
tags: [migration, capabilities, retirement, production-sections, management-api, deploy-precondition]

requires:
  - "45-03 — il file di ritiro, scritto su disco e mai applicato"
  - "45-05 — keys.ts a 17 chiavi, capability-routes.ts, le sette sedi del calendario"
  - "45-08 — le cinque migration additive applicate, e il baseline 16/0/0 misurato con una sessione vera"
  - "il deploy del commit 13f6be8, che e' un atto del proprietario e non di un piano"
provides:
  - "una versione nella history di produzione: 20260817220627"
  - "diciassette chiavi di capability, e production.read non e' piu' una di esse"
  - "trentasei grant: gli otto di sezione intatti, i due ritirati assenti"
  - "verify:capabilities verde 5/5 per la prima volta dal commit del piano 45-05"
  - "la terza misura consecutiva 16/0/0 su production_pipeline_rule, con una sessione vera"
affects:
  - "45-VERIFICATION.md — il rosso dichiarato di questa fase e' chiuso, e va scritto come chiuso"
  - "ogni piano a valle che leggeva verify:capabilities come rosso atteso"

tech-stack:
  added: []
  patterns:
    - "POST /v1/projects/{ref}/database/migrations — mai /database/query, mai PUT"
    - "la versione si legge dalla history, mai dal corpo della risposta POST"
    - "il conteggio di controllo si chiede a una porta diversa da quella su cui si e' agito"
    - "rimozione per chiave e per coppia, mai per selettore di prefisso"

key-files:
  created:
    - ".planning/phases/45-production-sections-section-by-section/45-09-SUMMARY.md"
  modified:
    - ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"

decisions:
  - "A2b chiesta, concessa e spesa il 2026-08-18: una applicazione del file di ritiro, piu' un solo re-run dello strumento del rifiuto. Registrata come SPESA nel ledger di 45-PROCEDURES.md"
  - "La precondizione del deploy e' stata ri-verificata da questo agente su due fonti indipendenti, invece di ereditare l'osservazione dell'orchestratore"
  - "La sonda anonima misura il MIDDLEWARE, non la singola rotta: il controllo su un path admin inesistente risponde 307 identico, e questa summary lo dice invece di rivendicare piu' di quanto abbia misurato"
  - "npm run verify NON esce 0, e non puo' uscirne per mano di questo piano: passa da exit 1 a exit 2 — da un fallimento a due rifiuti, entrambi DEF-45-01"

metrics:
  duration: "~20 minuti, 2026-08-17T21:56Z → 2026-08-17T22:16Z (2026-08-18 ora locale)"
  completed: 2026-08-18
  tasks: 2
  commits: 1
---

# Fase 45 Piano 09: Il ritiro di `production.read` — Summary

`production.read` non esiste piu', ne' come riga di catalogo ne' come grant, e
**la portata dell'accesso non si e' mossa di una riga**: gli stessi due ruoli
leggevano il calendario prima e lo leggono dopo, letti da
`private.role_capabilities` e non dalla memoria, e la coppia titolato/non-titolato
su `production_pipeline_rule` ha risposto `16 / 0 / 0` per la terza misura
consecutiva — prima dello split, dopo lo split, dopo il ritiro.

---

## Task 1 — La precondizione del deploy, osservata da capo invece che ereditata

L'orchestratore ha consegnato un'osservazione gia' fatta. **Un'osservazione
ereditata resta un'osservazione fatta da qualcun altro**, e questa e' l'unica
precondizione la cui caduta chiude fuori dal calendario un lettore titolato senza
lasciare nulla in nessun log — perche' questo progetto **non ha error tracking**.
Quindi e' stata rifatta.

### Fonte 1 — la history di git, letta nel worktree

```
origin/main                                    13f6be875bce3e598d0355f0ff0c9950048a82dd
13f6be8 e' antenato di origin/main             YES
13f6be8 e' origin/main                         (identici, byte per byte)
data del commit                                Mon Aug 17 23:36:49 2026 +0200
oggetto                                        docs(phase-45): update tracking after wave 8
```

**E il codice deployato non puo' chiedere la vecchia chiave.** Non e' un'assunzione
sul contenuto del commit: e' un grep sull'albero a quel commit.

```
git grep -nE "['\"]production[.]read['\"]" 13f6be8 -- src/     →  nessuna riga
```

Venti occorrenze di `production.read` esistono sotto `src/` a quel commit, e sono
**tutte prosa dentro un docblock** — righe che cominciano con `*`, che spiegano
cosa la chiave era prima dello split. **Zero literal fra apici**, quindi zero
chiamanti: `has_capability` non puo' essere invocata con quella stringa da nessun
punto del bundle spedito.

### Fonte 2 — l'API dei deployment di GitHub

```
deployment 5952029954   environment Production   sha 13f6be87   created 2026-08-17T21:54:12Z
  status                state success            2026-08-17T21:54:12Z
```

Ed e' **l'ultimo** deployment di produzione: la lista dei cinque piu' recenti mette
`13f6be87` in cima, e il precedente e' `fe67891a` del 14 agosto. Nessun deployment
successivo sta sopra quello che porta lo split.

### Fonte 3 — le sonde live, fatte da questo agente

Prese alle **`2026-08-17T22:03:19Z`**, cioe' **nove minuti dopo** che il
deployment ha riportato `success`.

| indirizzo | codice | `location:` |
|---|---|---|
| `/` | **200** | — |
| `/login` | **200** | — |
| `/events` | **200** | — |
| `/admin/calendar` | **307** | `/login?redirect=%2Fadmin%2Fcalendar` |
| `/admin/location` | **307** | `/login?redirect=%2Fadmin%2Flocation` |
| `/admin/manifesto` | **307** | `/login?redirect=%2Fadmin%2Fmanifesto` |
| `/admin/visual` | **307** | `/login?redirect=%2Fadmin%2Fvisual` |
| `/door` | **307** | `/login?redirect=%2Fdoor` |
| `/api/webhooks/sumup` | **405** | — |

> **⚠ E QUI VA DETTO COSA LA SONDA NON MISURA, PRIMA DI DIRE COSA MISURA.** La
> lettura istintiva di quei quattro `307` e' *«le tre superfici nuove sono
> deployate»*. **E' una lettura piu' forte della misura.** Il controllo:
>
> ```
> /admin/zzz-does-not-exist   →   307
> ```
>
> Un path admin che non esiste risponde **identico**. La sonda anonima non
> discrimina fra una rotta presente e una assente: discrimina il **middleware**.
> Che le tre pagine esistano nell'albero deployato e' un fatto di `git ls-tree`
> (`src/app/(admin)/admin/(work)/{location,manifesto,visual}/page.tsx`, presenti a
> `13f6be8`), non un fatto di `curl`. Le due prove restano separate.

**Cosa le sonde misurano davvero, ed e' precisamente la cosa che serviva.**
L'assertion di `capability-routes.ts` e' un `throw` **a module load dentro il
bundle del middleware**: se fosse scattata, ogni rotta coperta dal middleware
risponderebbe **500** — il webhook dei pagamenti e la strada della porta compresi.
Sono arrivati `307` con il parametro `redirect` corretto e un `405` dal webhook.
**L'assertion non ha lanciato**, e l'ha detto la produzione, non un build.

### Il terzo punto — «il calendario si apre per un master» — e chi l'ha osservato

**Questo agente non l'ha osservato, e non poteva.** Aprire il calendario da master
richiede una sessione, e coniare una sessione e' un atto: A2b ne autorizzava
**uno**, ed e' il re-run dello strumento del rifiuto, che avviene **dopo** il
ritiro.

L'osservazione «prima» esiste comunque, ed e' migliore di una pagina aperta a
mano: **il 2026-08-17, sotto A2, con una sessione master vera**, il piano 45-08 ha
letto `production_pipeline_rule` a **`16 / 0 / 0`** *dopo* che i sei arm erano gia'
passati a `production.calendar.manage`. Quella misura e' il «prima» di questo
piano, e sta in `45-08-SUMMARY.md`. Il «dopo» sta nel task 2 qui sotto. Fra le
due c'e' solo il ritiro.

### L'autorizzazione, con la sua data e il suo perimetro

**Concessa il 2026-08-18.** Le parole del proprietario: **«Autorizzato: ritiro +
rilettura».**

| Coperto | Non coperto, e ognuno chiederebbe il proprio atto |
|---|---|
| applicare `20260817120500_production_read_retire.sql`, **una volta sola**, via `POST /v1/projects/{ref}/database/migrations` | qualsiasi seconda applicazione |
| **piu'** un solo re-run di `verify:refusal`, che conia due sessioni proprie | qualsiasi ulteriore re-run |
| | qualsiasi scrittura di una riga di dati |
| | qualsiasi cancellazione oltre le tre `DELETE` che il file gia' contiene |

**A2b e' SPESA.** Una applicazione, un run. Registrata come tale nel ledger di
`45-PROCEDURES.md`, con la stessa data.

> **Una nota sull'orologio, perche' altrimenti sembra che l'atto preceda
> l'autorizzazione.** La macchina lavora in `Europe/Rome`, `UTC+02:00`. Il ritiro
> e' partito alle **`2026-08-17T22:06:27Z`**, che e' **`2026-08-18T00:06:27+02:00`**
> — stesso istante, e la data locale e' il **18**, la stessa dell'autorizzazione.
> Ogni orario UTC in questo documento va letto con quel `+2`.

---

## Task 2 — Snapshot, applicazione, rilettura, e il rosso dichiarato che si chiude

### Step 0 — La baseline degli strumenti, presa PRIMA di toccare la produzione

| comando | exit **prima** | cosa diceva |
|---|---|---|
| `npm run verify:capabilities` | **1** | `FAILED 3/5` — lati 0, 1 e 5, **una sola causa**: `production.read` |
| `npm run verify` | **1** | `VERIFY_FAIL — 1: verify:capabilities`, piu' due rifiuti (DEF-45-01) |

Il transcript del rosso, nella riga che conta:

```
TS 17 · DB 18 · POLICY 11 (73 call sites in 93 policies) · SRC 17 (306 files walked) · GRANT 38 rows
```

Diciassette dichiarate, diciotto presenti. **La differenza e' una riga sola**, ed
e' quella che questo piano toglie.

### Step 1 — Lo snapshot, prima di qualunque cosa

L'insieme di cascata **non e' stato ricordato: e' stato camminato**, con la stessa
radice del piano 45-08 — `public.formats`, `public.profiles`, `public.venues` — e
ogni `contype = 'f'` che le punta, fino a profondita' 12, unito alle undici tabelle
di produzione, alle due tabelle delle capability e a `storage.buckets`. La query
sta per intero nello strumento usato in **entrambi** i punti, byte per byte la
stessa: e' l'unica forma in cui due misure si possono confrontare.

**37 tabelle nel pre-snapshot, 37 nel post.** L'insieme non e' cambiato.

### Step 2 — Il pre-stato, letto dal catalogo

**Le diciotto chiavi, elencate e non contate** — `admin.access`,
`catalogue.manage`, `door.operate`, `door.supervise`, `master.manage`,
`media.upload`, `membership.active`, `membership.card.view`, `organizer.access`,
`party.manage`, `production.calendar.manage`, `production.location.manage`,
`production.manifesto.manage`, **`production.read`**, `production.visual.manage`,
`register.read`, `staff.manage`, `venue.reveal`.

**Le dieci coppie `(ruolo, capability)` su una chiave `production.*`, prima —
ed e' la lista contro cui si confronta il dopo, invece che una memoria:**

| ruolo | capability | `requires_approved` |
|---|---|---|
| master | `production.calendar.manage` | `false` |
| organizer | `production.calendar.manage` | `false` |
| master | `production.location.manage` | `false` |
| organizer | `production.location.manage` | `false` |
| master | `production.manifesto.manage` | `false` |
| organizer | `production.manifesto.manage` | `false` |
| **master** | **`production.read`** | **`false`** |
| **organizer** | **`production.read`** | **`false`** |
| master | `production.visual.manage` | `false` |
| organizer | `production.visual.manage` | `false` |

**Nessun `staff`, nessun `member`** compare su una chiave `production.*`: e' una
lettura, non una deduzione dal conteggio.

I sei arm del calendario, prima, chiedevano tutti
`production.calendar.manage` con il wrapper `( SELECT ` in testa.

### Step 3 — L'applicazione

Il file, riletto dal disco e verificato prima di partire:

```
sha256  cc41b3328a678e403bcf1aa06b1646017f67286d2f7a53fc09a88acfd26e060a
```

Il suo corpo eseguibile, tolti i commenti — **cinque righe, e sono queste:**

```sql
BEGIN;
DELETE FROM private.role_capabilities WHERE (role, capability) = ('master', 'production.read');
DELETE FROM private.role_capabilities WHERE (role, capability) = ('organizer', 'production.read');
DELETE FROM private.capabilities WHERE key = 'production.read';
COMMIT;
```

| controllo | atteso | misurato |
|---|---|---|
| `DELETE FROM` nel corpo | 3 | **3** |
| `LIKE` nel corpo | 0 | **0** |
| `public.` nel corpo | 0 | **0** |
| rimozione per chiave primaria / per coppia | 3 su 3 | **3 su 3** |
| ordine: i grant prima, il catalogo dopo | si' | **si'** |

**L'ordine non e' un'eleganza, ed e' la ragione per cui e' stato riletto invece
che ricordato.** `private.role_capabilities.capability` referenzia
`private.capabilities(key)` **`ON DELETE CASCADE`**: la chiave esterna **non
avrebbe rifiutato** l'ordine inverso — avrebbe portato via i due grant **in
silenzio, dentro un solo statement**. Per un file la cui unica funzione e'
rispondere a *la portata e' cambiata?*, uno statement con due effetti invisibili
nasconde meta' della risposta. Tre statement, tre effetti visibili, e la cascata
non scatta mai perche' non resta nulla da raggiungere.

**E il selettore di prefisso non e' stato usato, per la ragione che il file stesso
nomina:** dopo questa fase `LIKE 'production%'` corrisponde **anche alle quattro
chiavi di sezione**. Una rimozione scritta cosi' avrebbe tolto l'intera superficie
di produzione a entrambi i ruoli, e la superficie avrebbe risposto `false` senza
errore e senza riga di log — nel verso sbagliato del fallimento, quello che D12 ha
gia' pagato una volta.

**La history, prima:** dieci versioni lette, **zero** nominano
`production_read_retire`. Il file non era gia' applicato, quindi l'idempotenza non
ha coperto nulla in questa esecuzione.

**L'invio:**

```
sent at   : 2026-08-17T22:06:27Z   (2026-08-18T00:06:27+02:00)
endpoint  : POST /v1/projects/{ref}/database/migrations
name      : 20260817120500_production_read_retire
bytes sent: 4221
HTTP      : 200
body      : []
```

**Mai `/database/query`** — che applica senza registrare — **e mai `PUT`** — che
registra senza applicare.

**La versione assegnata, letta dalla history e non dalla risposta:**

```
20260817220627  20260817120500_production_read_retire     ← nuova
20260817190219  20260817120400_visual_archive_bucket
20260817190214  20260817120300_production_sections_access
20260817190211  20260817120200_production_sections
20260817190208  20260817120100_production_location
20260817190205  20260817120000_production_section_keys
```

Una riga sola nomina il ritiro. Un `200` su un `POST` e' un referto; la history e'
il fatto.

### Step 4 — La rilettura, dai cataloghi

**`private.capabilities` — diciassette righe, e nessuna e' `production.read`:**

```
capability_rows=17   production_read_rows=0
```

**Le chiavi `production.*` rimaste, ELENCATE e non contate** — perche' un conteggio
giusto sopra un insieme sbagliato e' indistinguibile da un conteggio giusto:

```
production.calendar.manage
production.location.manage
production.manifesto.manage
production.visual.manage
```

Quattro, e sono le quattro di sezione. Nessun'altra chiave comincia per
`production.`.

**`private.role_capabilities` — gli otto grant di sezione, coppia per coppia, e
confrontati con la lista dello step 2 invece che con un ricordo:**

| ruolo | capability | prima | dopo |
|---|---|---|---|
| master | `production.calendar.manage` | `false` | **`false`** |
| organizer | `production.calendar.manage` | `false` | **`false`** |
| master | `production.location.manage` | `false` | **`false`** |
| organizer | `production.location.manage` | `false` | **`false`** |
| master | `production.manifesto.manage` | `false` | **`false`** |
| organizer | `production.manifesto.manage` | `false` | **`false`** |
| master | `production.visual.manage` | `false` | **`false`** |
| organizer | `production.visual.manage` | `false` | **`false`** |
| ~~master~~ | ~~`production.read`~~ | `false` | **assente** |
| ~~organizer~~ | ~~`production.read`~~ | `false` | **assente** |

**Otto identici, due assenti.** Nessuna coppia e' comparsa, nessuna e' cambiata di
`requires_approved`. **E' l'evidenza del vincolo 3 di D-45-04** — *lo split cambia
il nome di una chiave e non chi puo' leggere* — nella sua forma piu' diretta: due
liste, lette dallo stesso catalogo con la stessa query, prima e dopo.

**I due ruoli che leggono il calendario, letti da `private.role_capabilities`:**
**master e organizer prima, master e organizer dopo.**

Grant totali: **38 → 36**.

**`pg_policies` — i sei arm del calendario, invariati:**

Stessi sei nomi, stesso `cmd`, stessi `roles`, e **`qual` byte-identico** su tutti
e sei:

```
( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
```

Il file non tocca nessuna policy, e i cataloghi lo confermano. Se un `qual` si
fosse mosso, avrebbe girato qualcos'altro.

### Step 5 — Il post-snapshot, e le tre righe nominate una per una

Il diff dei due snapshot, **meccanico e non a occhio** — `diff(1)` sui due file:

```
1,2c1,2
< private	capabilities	18
< private	role_capabilities	38
---
> private	capabilities	17
> private	role_capabilities	36
```

**Due righe di output, tre righe di database, e sono esattamente le tre che il
file scrive:**

1. `private.role_capabilities` — la coppia `('master', 'production.read')`
2. `private.role_capabilities` — la coppia `('organizer', 'production.read')`
3. `private.capabilities` — la riga con `key = 'production.read'`

**35 tabelle su 37 identiche al byte.** Nessuna quarta differenza. In particolare
**non si e' mossa la sezione location** — `production_space` a **184** e
`production_space_attribute` a **1840** prima e dopo — che e' la meta' dello
snapshot in cui una cascata inattesa si sarebbe vista, ed e' anche la tabella che
porta un indirizzo su ogni riga.

#### La riconciliazione con il post-snapshot del piano 45-08, che va detta

Il pre-snapshot di questo piano **non e'** identico al post-snapshot di 45-08, e
tacerlo sarebbe stato un silenzio. Due tabelle differiscono:

| tabella | post 45-08 | pre 45-09 | perche' |
|---|---|---|---|
| `production_space` | 0 | **184** | il seed del piano 45-10, sotto A3, spesa il 2026-08-17 |
| `production_space_attribute` | 0 | **1840** | lo stesso seed — dieci attributi per spazio |

Le altre 35 sono identiche. Le due che si sono mosse hanno **un atto autorizzato
con nome e data** dietro, registrato nel ledger di `45-PROCEDURES.md` alla riga A3,
e 184 e' il numero di spazi che `venue-acquisition.md` dichiara indipendentemente.

### Step 6 — Il gate, verde per la prima volta dal commit del piano 45-05

```
verify-capabilities — one capability set, five sides

  measured against: production (Management API, read_only)
      TS 17 · DB 17 · POLICY 11 (73 call sites in 93 policies) · SRC 17 (306 files walked) · GRANT 36 rows

  ✓ 0 · both declarations hold the pre-registered 17 keys
      17 in src/lib/capabilities/keys.ts, 17 in private.capabilities
  ✓ 1 · TS and DB name the same keys
      17 keys, both directions
  ✓ 2 · every key a policy asks for exists in the catalogue
      11 keys used by policies: catalogue.manage, door.operate, master.manage, membership.active, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.visual.manage, register.read, staff.manage
  ✓ 3 · every key application code asks for exists in the catalogue
      17 keys used in src/: admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.visual.manage, register.read, staff.manage, venue.reveal
  ✓ 4 · every catalogue key is asked for by a policy or by src/
      17 keys, all reached: 11 by policy, 17 by src/ — asked-for, NOT route-bound; routes are capability-routes.ts + `npm run build`
  ✓ 5 · every role holds exactly the declared set of capabilities
      36 grants and 32 refusals over 4 roles × 17 keys, both directions, 36 rows read

5/5 green, 0 warnings.
```

**Exit code: `0`.**

I numeri che il piano aveva scritto in anticipo, uno per uno:

| il piano diceva | misurato |
|---|---|
| diciassette chiavi dichiarate | **17** |
| diciassette presenti | **17** |
| sessantotto coppie | **4 ruoli × 17 chiavi = 68** |
| trentasei grant | **36** |
| trentadue rifiuti | **32** |
| lato 5: `staff` e `member` non hanno nessuna delle quattro | **confermato**, e letto per elenco allo step 4 |

**E il verde e' arrivato per il verso giusto.** `git status --short` dopo il run:
vuoto. `git diff -- scripts/`: vuoto. **Nessuna costante e' stata toccata.**
Abbassare `EXPECTED_KEY_COUNT` da 17 a 18 avrebbe prodotto lo stesso verde ieri, ed
e' il fallimento per cui quella costante esiste — lo script lo dice da solo:
*«Look at the model, NOT at EXPECTED_KEY_COUNT»*. Qui e' il **modello** ad aver
raggiunto la dichiarazione.

### Step 7 — Lo strumento del rifiuto, e perche' e' anche il conteggio di controllo

Un solo run, quello che A2b autorizzava.

```
    table                         master  member   anon  outcome
    production_plan                    0       0      0  REFUSED — the positive control is silent
    production_piece                   0       0      0  REFUSED — the positive control is silent
    production_commitment              0       0      0  REFUSED — the positive control is silent
    production_checklist_item          0       0      0  REFUSED — the positive control is silent
    production_import_run              0       0      0  REFUSED — the positive control is silent
    production_pipeline_rule          16       0      0  pair held — entitled reads, unentitled reads nothing
    production_space                 184       0      0  pair held — entitled reads, unentitled reads nothing
    production_space_attribute      1840       0      0  pair held — entitled reads, unentitled reads nothing
    production_section                 0       0      0  REFUSED — the positive control is silent
    production_visual_asset            0       0      0  REFUSED — the positive control is silent
    production_open_question           0       0      0  REFUSED — the positive control is silent

    rows declared                   11
    rows where the pair held         3
    rows REFUSED — not measured      8

    master     signed out globally · token still resolves to a user: false
    member     signed out globally · token still resolves to a user: false
```

**Exit code: `2`**, riportato com'e' caduto — ed e' l'esito onesto, non un difetto:
su una tabella con zero righe la risposta del titolato e quella del non titolato
sono gli stessi byte, e la coppia non discrimina.

#### Il confronto contro il baseline 16/0/0

| | 45-02 (prima dello split) | 45-08 (dopo lo split) | **45-09 (dopo il ritiro)** |
|---|---|---|---|
| `production_pipeline_rule` | **`16 / 0 / 0`** | **`16 / 0 / 0`** | **`16 / 0 / 0`** |
| chiave chiesta dai sei arm | `production.read` | `production.calendar.manage` | `production.calendar.manage` |
| coppie tenute | 1 | 1 | **3** |
| righe REFUSED | 5 | 10 | **8** |
| exit code | `2` | `2` | **`2`** |
| revoca master / member | `false` / `false` | `false` / `false` | **`false` / `false`** |

**La riga che doveva restare identica e' identica per la terza volta.** Sedici
righe lette da un master, zero da un member, zero da un anonimo — prima che la
chiave cambiasse nome, dopo che era cambiata, e dopo che la vecchia e' stata
tolta. Se si fosse mossa, il ritiro avrebbe cambiato la portata invece del nome, e
questa fase si sarebbe fermata qui.

**Due coppie in piu' hanno tenuto, ed e' una misura nuova che questo run ha
comprato.** `production_space` a `184 / 0 / 0` e `production_space_attribute` a
`1840 / 0 / 0`: e' la **prima volta** che le policy della sezione location vengono
misurate contro un soggetto vero invece che contro una tabella vuota. Un master
legge i 184 spazi; un member ne legge **zero**; un anonimo ne legge **zero**. E'
la sezione che porta un indirizzo su ogni riga (D-45-21), quindi e' anche quella
in cui uno zero conta di piu'.

#### Perche' questo run soddisfa il gate del conteggio di controllo

`ai-engineering.md`, *gate il contatore di controllo non legge la superficie che
sta muovendo*: la conferma di una rimozione si chiede **a una fonte diversa da
quella su cui si e' agito**.

- **Ho agito** attraverso l'endpoint delle migration dell'API di gestione.
- **La conferma** arriva da PostgREST con un JWT vero, firmato da una sessione
  coniata: altra porta, altro protocollo, e — questo e' il punto — **un percorso
  che la RLS governa davvero**, mentre l'API di gestione la scavalca.

Una misura presa con lo strumento che ha causato l'effetto e' un'eco. Questa no.

### ⚠ E cosa nulla di tutto questo dimostra

**Nessuna lettura di catalogo dice che una policy rifiuta qualcuno.** L'API di
gestione si connette con un ruolo che **scavalca la RLS**: `verify:capabilities`
prova che il modello e' quello che il codice dichiara, e non prova nulla su chi
viene respinto. Lo dice solo lo strumento del rifiuto — e anche lui, sulle otto
tabelle vuote, dichiara onestamente di non aver misurato.

**E il criterio 1 resta aperto.** *Un lettore che possiede una sezione viene
rifiutato sulle altre*: sotto D-45-03 le quattro chiavi vanno agli stessi due
ruoli, quindi **in produzione non esiste un soggetto per cui quel rifiuto
avvenga**, e D-45-23 vieta di fabbricarne uno. Lo chiude la **procedura P1**, in
un ambiente usa-e-getta, e il suo `Result` legge ancora `pending`.

---

## Verifiche meccaniche

| comando | prima | dopo | letto come |
|---|---|---|---|
| `npm run verify:capabilities` | **1** | **0** | il rosso dichiarato di questa fase e' **chiuso** |
| `npm run verify` | **1** | **2** | vedi la deviazione 1 — da un fallimento a due rifiuti |
| `npm run verify:refusal` | — | **2** | rifiuto onesto su otto tabelle vuote, tre coppie tenute |
| `git status --short` | vuoto | **vuoto** | nessun file di prodotto toccato |
| `git diff -- scripts/` | vuoto | **vuoto** | nessuna costante spostata per far tornare un verde |

### `npm run build` non e' stato lanciato, e la ragione non e' la fretta

Questo piano **non tocca un solo file sotto `src/`**: `git status --short` e'
vuoto dall'inizio alla fine. Un build qui compilerebbe **gli stessi byte** che la
produzione ha gia' compilato — e quel build esiste, e' il deployment
`5952029954`, e ha riportato `success`. E' la misura piu' forte delle due, perche'
e' quella reale. Rifarla in locale sarebbe stato un rumore, non una prova.

---

## Deviazioni dal piano

### 1. [Fuori perimetro — non riparata] `npm run verify` non esce 0, e non puo' uscirne per mano di questo piano

- **Criterio del piano:** *«`npm run verify` exits 0»*.
- **Misurato:** **exit 1 prima, exit 2 dopo.**
- **Cosa e' cambiato davvero, ed e' il movimento che il criterio voleva:** prima
  l'aggregatore diceva `VERIFY_FAIL — 1: verify:capabilities`. Dopo dice
  `VERIFY_REFUSED — 2 gate(s) could not measure: verify:conversion,
  verify:touch-targets`, e sopra: **«No gate that reached a verdict reported a
  failure.»** L'unico **fallimento** e' sparito; restano due **rifiuti**.
- **Perche' il `2` non e' mio:** i due gate rifiutano perche' la lista `CONVERTED`
  nomina quattro pagine che non sono su disco — `/admin/analytics`,
  `/admin/analytics/compare`, `/admin/analytics/members`, `/admin/finance` —
  rimosse dal prodotto per decisione dichiarata (Finance e Analytics vivono in
  SumUp). E' **DEF-45-01**, registrata durante il piano 45-02, pre-esistente a
  questa fase, e appartiene a chi ha rimosso quelle superfici.
- **Perche' NON l'ho riparata:** togliere quattro voci da `CONVERTED` avrebbe
  fatto uscire `0` questo comando e avrebbe nascosto chi ha prodotto il difetto,
  dentro un piano che non lo possiede. L'aggregatore distingue apposta un `1` da
  un `2`: **un rifiuto non e' un pass**, e un `0` ottenuto cosi' sarebbe stato un
  verde sopra due gate che non misurano nulla.
- **Files modified:** nessuno.

### 2. [Lettura, non deviazione] La sonda anonima misura il middleware, non la rotta

Documentato per esteso nel task 1. Il piano chiede di aprire *«un indirizzo gated»*
e osservare *«una pagina, non un 500»*. Un `307` su `/admin/calendar` prova che il
middleware gira e che l'assertion non ha lanciato — **e non prova** che una rotta
specifica sia deployata, perche' un path admin inesistente risponde identico. Il
controllo e' stato preso, e la conclusione e' scritta nella forma piu' stretta che
la misura regge.

### 3. [Lettura, non deviazione] Il terzo punto del task 1 e' stato osservato da altri

*«Il calendario si apre per un master»*, **prima** del ritiro, non e'
un'osservazione di questo agente: e' la misura di 45-08 del 2026-08-17,
`16 / 0 / 0` con una sessione master vera sui sei arm gia' riscritti. Coniare una
sessione qui sarebbe stato un atto in piu' di quelli autorizzati. La misura
«dopo» invece e' mia, ed e' nello step 7.

### 4. [Nota d'ambiente] `node_modules` e `.env.local` nel worktree

Un worktree nasce senza entrambi. `node_modules` e' stato **collegato** al
checkout primario, `.env.local` **copiato** da li'. Entrambi sono in `.gitignore`
— verificato con `git check-ignore -v` prima di procedere — nessuna credenziale e'
stata stampata, committata o scritta in un file tracciato, e **entrambi sono
rimossi in chiusura**, con `git status` pulito.

### Nessun'altra deviazione

Nessuna riga di dati e' stata scritta. Nessuna riga e' stata cancellata oltre le
tre che il file di migration contiene. Nessuna migration gia' applicata e' stata
modificata. Nessuna costante e' stata spostata.

---

## Cosa questo piano lascia aperto, nominato invece che sottinteso

1. **Il criterio 1 sul soggetto.** Procedura P1, ambiente usa-e-getta,
   `Result: pending`. Nessun exit code di questa fase lo sostituisce.
2. **P2, P3 e P4.** Chiedono come una schermata **si legge**, e nessuna assertion
   su stringhe ha un'opinione in merito. Tutte e tre `pending`.
3. **DEF-45-01.** I due gate che rifiutano restano rossi finche' non li ripara chi
   li possiede. Fino ad allora `npm run verify` esce `2` su un albero corretto.
4. **DEF-45-03.** Nessuno confronta le **descrizioni** delle capability: la
   byte-identita' fra `CAP_DESCRIPTIONS` e la migration resta una convenzione
   documentale, oggi su quattro stringhe invece che una.
5. **Otto tabelle su undici restano vuote**, quindi il loro rifiuto non e' ancora
   misurabile. Non e' un difetto: e' cosa succede quando una policy non ha righe
   su cui discriminare.

## Known Stubs

Nessuno. Questo piano non tocca un file di prodotto: cambia tre righe in
produzione e scrive due documenti.

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano — e non
poteva essercene, perche' nessun file sotto `src/` e nessuna policy sono stati
toccati. Le cinque voci del registro hanno ognuna la propria misura qui sopra:

| voce | misura |
|---|---|
| **T-45-04** — DoS sulle quattro superfici | il deploy osservato su tre fonti, l'assertion non lanciata, e il ritiro applicato **dopo** |
| **T-45-08** — tampering su `role_capabilities` | rimozione per chiave e per coppia, `LIKE` = 0 misurato, due snapshot con **tre** differenze nominate |
| **T-45-04b** — elevation sugli otto grant di sezione | le due liste coppia per coppia, prima e dopo, identiche |
| **T-45-12** — repudiation sulla history | endpoint delle migration, versione `20260817220627` letta dalla history |
| **T-45-SC** — install di pacchetti | **nessun pacchetto installato**; `node_modules` collegato, non scaricato |

---

## Self-Check: PASSED

| affermazione | come e' stata controllata | esito |
|---|---|---|
| `45-09-SUMMARY.md` esiste | `test -f` | FOUND |
| `45-PROCEDURES.md` porta la riga A2b | `grep` sul file | FOUND |
| la versione `20260817220627` e' nella history di produzione | query su `supabase_migrations.schema_migrations` | **presente, 1 riga** |
| `production.read` non e' piu' nel catalogo | `count(*) FILTER (WHERE key = 'production.read')` | **0** |
| gli otto grant di sezione sono intatti | elenco coppia per coppia, prima e dopo | **8 = 8** |
| il commit di questo piano esiste | `git log --oneline --all` | FOUND — vedi sotto |

L'ultima riga di sostanza e' stata chiesta **al database e a una sessione vera**,
mai alle risposte `HTTP 200` che l'avevano annunciata.

---

*Fase 45, piano 09 — scritto il 2026-08-18. Non contiene nessuno spazio, nessuna
data non annunciata, nessuna line-up e nessun nome di persona: solo parole di
ruolo, nomi di tabella, chiavi di capability e conteggi. `re:sonate` si scrive con
la e normale.*
