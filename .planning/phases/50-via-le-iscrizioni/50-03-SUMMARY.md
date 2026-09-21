---
phase: 50-via-le-iscrizioni
plan: 03
subsystem: database
tags: [supabase, postgres, migration, management-api, ticketing, idempotenza, indice-parziale]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 02
    provides: il laboratorio migrato senza `profiles.status`, e il precedente scritto del verso invertito del deploy
provides:
  - "`supabase/migrations/20260921120100_free_order.sql`: `ticket_orders.sumup_checkout_id` nullabile con indice unico PARZIALE, `buyer_name` sull'ordine, e il livello a prezzo zero per le serate `free_rsvp` gia' esistenti — applicata al LABORATORIO"
  - "l'idempotenza del pagamento provata invariata: due ordini con lo stesso checkout si scontrano ancora, con lo stesso nome di vincolo"
  - "un ordine a totale zero che produce biglietti veri, `sumup_checkout_id` nullo e `issued_via = 'free_rsvp'`, e che chiamato due volte non ne conia di nuovi"
  - "i tipi allineati nello stesso commit, senza anticipare la rimozione dello stato (che e' del piano 50-09)"
affects: [50-04, 50-11]

tech-stack:
  added: []
  patterns:
    - "un vincolo unico che deve fare posto a un `NULL` legittimo si sostituisce con un indice unico PARZIALE che conserva lo STESSO NOME: il messaggio `23505` continua a nominare cio' che chi legge si aspetta"
    - "un riempimento che sul banco e' un no-op non prova niente: si costruiscono apposta le righe che lo faranno lavorare, si misura, e si rimettono le cose com'erano"
    - "la Management API gira come `supabase_read_only_user`: una funzione concessa al solo `service_role` si prova da PostgREST con la chiave di servizio, non dall'endpoint SQL"

key-files:
  created:
    - supabase/migrations/20260921120100_free_order.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "L'indice parziale conserva il NOME del vincolo che sostituisce (`ticket_orders_sumup_checkout_id_key`): misurato che il `23505` lo nomina ancora, quindi chi cerca la garanzia la trova dove si aspetta"
  - "Il riempimento e' stato esercitato su DUE serate costruite apposta — una con capienza, una senza — perche' sul banco com'e' seminato avrebbe toccato zero righe e un no-op non e' una misura"
  - "Le righe delle prove sono state cancellate dal banco alla fine: lasciarle avrebbe fatto misurare a `P-50-7` una capienza di 2 credendola di 4"
  - "Nessun vincolo di unicita' su `price = 0`: vieterebbe a una serata a pagamento il livello omaggio, che il banco stesso usa"

patterns-established:
  - "Prima di applicare, si legge dal catalogo il NOME reale del vincolo da sostituire: `ticket_orders_sumup_checkout_id_key` non era scritto in nessun file, lo conia Postgres"
  - "Una sonda che DEVE fallire (`23505` sul checkout doppio) vale quanto una che deve riuscire, e va spesa"

requirements-completed: [REG-06]

duration: 22min
completed: 2026-09-21
---

# Phase 50 Plan 03: L'ordine a totale zero Summary

**Sul laboratorio un ordine puo' esistere senza checkout SumUp e la RPC lo chiude emettendo biglietti veri — due, con `sumup_checkout_id` nullo e `issued_via = 'free_rsvp'` — mentre due ordini con lo stesso checkout continuano a scontrarsi con lo stesso `23505` e lo stesso nome di vincolo. La produzione non e' stata toccata.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-09-21T13:00Z (circa)
- **Completed:** 2026-09-21T13:12Z
- **Tasks:** 3 su 3
- **Files modified:** 2 (1 migration nuova, 1 file di tipi)

## Task Commits

1. **Task 1 + Task 2 fusi: la migration e i tipi** — `5c6548a` (feat)
2. **Task 3** — nessun file del repository cambia: il suo esito e' l'applicazione al laboratorio e le riletture, che stanno qui sotto

> **Perche' i task 1 e 2 sono un commit solo.** Lo chiede il piano: il titolo del
> task 2 e' *«I tipi, nello stesso commit»*, e l'`<objective>` dice *«una
> migration additiva applicata al laboratorio, e i tipi allineati nello stesso
> commit»*. Due commit separati avrebbero lasciato, fra l'uno e l'altro, un
> albero in cui il tipo dichiara `sumup_checkout_id: string` mentre la migration
> accanto a lui lo rende nullabile — cioe' un tipo che mente, che
> `supabase-data.md` chiama peggiore di un tipo assente.

## L'applicazione al laboratorio

| | |
|---|---|
| **Applicazione riuscita** | 2026-09-21 **13:09:20Z** — `200`, nessun tentativo fallito |
| **Versione coniata dall'endpoint** | **`20260921130920`** / `free_order` |
| **Nome del file** | `20260921120100_free_order.sql` |
| **Ordine rispetto al 50-02** | corretto: `20260921124829` (`drop_status_and_referral`) prima, `20260921130920` (`free_order`) dopo |
| **Endpoint** | `POST /v1/projects/{ref}/database/migrations`, mai `/database/query` |
| **Produzione** | **nessuna scrittura, nessuna lettura.** Ognuno dei quattro client usati in questo piano rifiuta il ref di produzione come prima riga eseguita, prima di qualunque `fetch` |

> **La versione registrata NON e' il timestamp del file**, ed e' l'**ottava**
> volta su otto. L'endpoint conia la versione con l'istante dell'applicazione:
> chi cercasse domani questa migration in
> `supabase_migrations.schema_migrations` per il numero del file **non la
> troverebbe**.

### Il verso del deploy, scritto dentro la migration

`20260921120100_free_order.sql:14-39` porta l'inversione di D-50-24 — **codice
prima, migration dopo** — nella forma che `20260809006000` e
`20260921120000_drop_status_and_referral.sql` hanno gia' scritto. La ragione qui
e' **sua**, e va detta invece di ereditata: le due colonne sono additive e non
romperebbero il percorso pagato, ma il **riempimento** creerebbe livelli di
biglietto a prezzo zero su serate gratuite **prima** che esista il percorso che
li usa — cioe' righe visibili alle letture pubbliche della serata senza una
strada per prenotarle. La produzione arriva nel piano 50-11.

## Le riletture dal catalogo

Tutte **dopo** l'applicazione, sull'endpoint `/database/query` con
`read_only: true`, mai dalla risposta del `POST`.

### Le colonne — `information_schema.columns`

```json
{"checkout_nullable":"YES",
 "buyer_name":{"type":"text","nullable":"YES","def":null}}
```

`sumup_checkout_id` e' **nullabile**; `buyer_name` **esiste**, e' `text`,
nullabile e **senza default** — nessun riempimento, come la convenzione di
`issued_via` (`20260905120000:171-176`) prescrive.

### Gli indici e i vincoli — `pg_indexes` e `pg_constraint`

```json
"indici_checkout":[
 {"indexname":"idx_ticket_orders_checkout",
  "def":"CREATE INDEX idx_ticket_orders_checkout ON public.ticket_orders USING btree (sumup_checkout_id)"},
 {"indexname":"ticket_orders_sumup_checkout_id_key",
  "def":"CREATE UNIQUE INDEX ticket_orders_sumup_checkout_id_key ON public.ticket_orders USING btree (sumup_checkout_id) WHERE (sumup_checkout_id IS NOT NULL)"}],
"vincoli_unici":[]
```

L'indice unico **parziale** c'e', con `IS NOT NULL` nella definizione; i vincoli
`u` su `ticket_orders` sono **zero** (prima erano **uno**:
`ticket_orders_sumup_checkout_id_key UNIQUE (sumup_checkout_id)`, letto alle
13:04:33Z).

### La RPC — `pg_proc.proacl`, identico prima e dopo

| | `proacl` |
|---|---|
| **prima** (13:08:12Z) | `{postgres=X/postgres,service_role=X/postgres}` |
| **dopo l'applicazione** (13:09:38Z) | `{postgres=X/postgres,service_role=X/postgres}` |
| **dopo le prove** (13:11:18Z) | `{postgres=X/postgres,service_role=X/postgres}` |

**Nessun `GRANT` e nessun `REVOKE` sono stati eseguiti**, ed e' verificato due
volte: dal catalogo qui sopra e dal grep sul corpo non commentato della
migration, che restituisce **0** (`GRANT|REVOKE|reserve_ticket_order`).

### Il riempimento — quante righe ha toccato, misurato

| Momento | `ticket_tiers` | serate `free_rsvp` **senza** livello a zero |
|---|---|---|
| banco come seminato (13:04:33Z) | 3 | **0** |
| dopo aver costruito due serate di prova (13:09:13Z) | 3 | **2** |
| **dopo l'applicazione** (13:09:38Z) | **5** | **0** |

**Il riempimento ha creato due righe**, e sono i due rami:

```json
[{"serata":"Lab Free Night",                          "capienza":4,   "tier":"RSVP","prezzo":0,"quantity":4},
 {"serata":"Prova 50-03 A (capienza 7)",              "capienza":7,   "tier":"RSVP","prezzo":0,"quantity":7},
 {"serata":"Prova 50-03 B (capienza non dichiarata)", "capienza":null,"tier":"RSVP","prezzo":0,"quantity":null}]
```

La prima riga e' il livello che il seme del banco creava gia' da se': il
riempimento **non l'ha toccata**, ed e' il `NOT EXISTS` che fa il suo lavoro. La
seconda copia la capienza; la terza la lascia **nulla**, che su
`ticket_tiers.quantity` significa *illimitato* ed e' la traduzione corretta di
*«capienza non dichiarata»* su `event_parties.capacity`.

> **Le due serate di prova sono state costruite apposta, e va detto invece che
> nascosto.** Sul banco com'e' seminato il riempimento avrebbe toccato **zero
> righe** — il seme (`scripts/seed-lab-door.mjs:346-349`) crea gia' il livello
> `RSVP` a 0 — e un no-op non prova che l'istruzione funzioni: prova solo che
> non ha trovato niente da fare. Due serate `free_rsvp` senza livello, una con
> capienza e una senza, sono state inserite **prima** dell'applicazione perche'
> il riempimento avesse qualcosa da fare e il `quantity` avesse due valori da
> misurare.

### Il conteggio per la produzione, che qui NON e' stato preso

Questa fase non legge la produzione. La riga del riempimento in produzione **si
misura nel piano 50-11, prima di applicare**, con questa query in sola lettura:

```sql
select count(*) from public.event_parties ep
 where ep.access_type = 'free_rsvp'
   and not exists (select 1 from public.ticket_tiers tt
                    where tt.party_id = ep.id and tt.price = 0);
```

Scritta qui perche' venga eseguita li', non perche' sia gia' nota.

## Le prove a mano, sul laboratorio, lette e non dedotte

### Sonda A — l'idempotenza del pagamento DEVE ancora rifiutare

Due ordini con lo **stesso** `sumup_checkout_id`, in un `INSERT` solo:

```
HTTP 400 @ 2026-09-21T13:10:19Z
ERROR: 23505: duplicate key value violates unique constraint
       "ticket_orders_sumup_checkout_id_key"
DETAIL: Key (sumup_checkout_id)=(PROVA-50-03-DOPPIO) already exists.
```

**E' la sonda che conta piu' di tutte**, perche' e' quella che poteva smentire il
piano. Due cose insieme: la garanzia regge, e il messaggio nomina **ancora**
`ticket_orders_sumup_checkout_id_key` — che e' la ragione per cui l'indice
conserva il nome del vincolo che sostituisce.

### Sonda B — due ordini SENZA checkout devono convivere

```json
{"ordini_senza_checkout_convivono": 2}
```

E' cio' che il vincolo pieno vietava e che l'indice parziale permette. Senza
questa riga il percorso gratuito avrebbe un tetto di **un ordine per sempre**.

### La prova principale — un ordine a totale zero che emette biglietti

Ordine costruito a mano: `sumup_checkout_id = NULL`, `status = 'pending'`
(**non** `completed`: nascere `completed` cadrebbe nel ramo idempotente di
`20260905120100:77-84` e restituirebbe l'insieme vuoto **senza errore** — la
riga di D-50-19 che `50-RESEARCH.md` §6.4 corregge), `total_amount = 0`,
`quantity = 2`, `buyer_name = 'Prova Cinquanta Tre'`, livello a prezzo zero
della serata gratuita del banco.

`reserve_ticket_order` chiamata **da PostgREST con la chiave di servizio** —
l'endpoint SQL della Management API gira come `supabase_read_only_user`
(misurato: `current_user`) e sarebbe stato rifiutato con `42501`, esattamente
come `reconcile_master` nel 50-02:

```
giro 1 — HTTP 200 @ 13:11:05.710Z  ["4cc36a60-…773f9", "db6294d2-…0a327e"]
giro 2 — HTTP 200 @ 13:11:05.801Z  ["4cc36a60-…773f9", "db6294d2-…0a327e"]
```

**Stessi due id, nessun id nuovo.** Riletto dal catalogo subito dopo:

```json
{"quanti":2,
 "stato_ordine":"completed","checkout_ordine":null,
 "biglietti_dell_ordine":[
   {"holder":"1 di 2","checkout":null,"issued_via":"free_rsvp","amount":0},
   {"holder":"2 di 2","checkout":null,"issued_via":"free_rsvp","amount":0}],
 "gratuiti_con_checkout_non_nullo":0}
```

- **due** biglietti alla prima chiamata, **zero nuovi** alla seconda (`quanti` e'
  2, non 4);
- `sumup_checkout_id` **nullo** su entrambi — quindi
  `reconcile-refunds/route.ts:105` esce con `continue` e **nessuna richiesta
  parte verso SumUp**, oggi e ogni giorno da oggi in poi;
- `issued_via = 'free_rsvp'`, un valore nuovo su una colonna di testo nudo:
  **nessun `CHECK` allargato**;
- `holder_label` e' `1 di 2` / `2 di 2` — un progressivo, **non il nome**, che
  pure l'ordine porta in `buyer_name`.

### La capienza rifiuta, e con la sua causa

Un secondo ordine a totale zero da **3** biglietti sul livello da 4 con 2 gia'
emessi:

```json
{"code":"P0001","message":"reserve_ticket_order: il tier ha 2 posti liberi, l'ordine dc82a9d0-… ne chiede 3"}
```

E' il ramo `20260905120100:145-163` che legge `tt.quantity FOR UPDATE` dal
livello a prezzo zero: **la capienza della serata gratuita viene applicata
dentro la transazione**, che e' l'unico posto dove regge sotto concorrenza. E
rifiuta la **capienza**, non il tetto per ordine — che su quella serata e' 6
(`max_tickets_per_order`, letto dal catalogo), quindi 3 lo supera.

### Il banco e' stato rimesso com'era

| | ordini | biglietti | tier | serate `free_rsvp` | senza livello a zero |
|---|---|---|---|---|---|
| **prima** (13:08:12Z) | 0 | 1 | 3 | 1 | 0 |
| **dopo la pulizia** (13:12:06Z) | 0 | 1 | 3 | 1 | 0 |

Le **modifiche di schema restano** — sono il punto: `checkout_nullable: YES`,
`buyer_name_esiste: 1`, `vincoli_unici: 0`. Spariscono solo le righe delle
prove. Lasciarle avrebbe fatto trovare a `P-50-7` la serata gratuita con due
biglietti gia' emessi, e misurare una capienza di **2** credendola di **4**.

## I tipi, nello stesso commit

- `src/types/database.ts:635` — `sumup_checkout_id: string | null`, con il
  commento che dice **quando** e' nullo (ordine a totale zero) e perche' **non**
  e' un valore sintetico (`:617-634`).
- `src/types/database.ts:610` — `buyer_name: string | null`, con il commento che
  dichiara che il nome va all'account e **mai** sul biglietto (`:596-609`).
- **I tipi dello stato non sono toccati**: `UserStatus` compare ancora **4**
  volte. Li smonta il piano 50-09, quando nessuna riga di `src/` li nomina piu';
  toglierli ora romperebbe il build di ogni piano dell'onda successiva, e in
  questo repository il compilatore e' l'unico controllo automatico che esiste.

**Non e' un tipo generato:** `src/types/database.ts` non espone un tipo
`Database` e il client Supabase non e' parametrizzato su di esso, quindi la
nullabilita' nuova **non si propaga da sola** ai chiamanti — `payment/callback/
actions.ts:183` e `lib/tickets/replay-order-delivery.ts:86,120` passano
`order.sumup_checkout_id` a `getCheckout(...)` e il compilatore **non** li
segnala. Su quei due percorsi il campo non e' mai nullo per costruzione (nascono
da un checkout), ma **chi scrivera' il percorso gratuito nel 50-04 non ha una
rete di compilazione**: e' scritto qui perche' non venga scoperto li'.

## La verifica

- **`npm run build` → exit 0**, `✓ Compiled successfully`. E' il typecheck di
  Next: in questo repository non esiste un test runner per il prodotto, e
  nessuna riga di questo SUMMARY dice che «i test passano».
- I grep di accettazione sulla migration:

  | Grep | Atteso | Misurato |
  |---|---|---|
  | `DROP NOT NULL` | ≥ 1 | **1** |
  | `CREATE UNIQUE INDEX.*sumup_checkout_id` | 1, con `WHERE … IS NOT NULL` sulla riga seguente | **1**, `:119-120` |
  | `buyer_name` | ≥ 2 | **3** |
  | `free_rsvp` | ≥ 1 | **4** |
  | `GRANT\|REVOKE\|reserve_ticket_order` sul corpo **non commentato** | 0 | **0** |
  | `holder_label` sul corpo **non commentato** | 0 | **0** |

  > Gli ultimi due hanno richiesto una correzione **prima** del commit: la prima
  > stesura dei `COMMENT ON` nominava `holder_label` e `reserve_ticket_order`
  > **dentro le stringhe SQL**, che non sono righe di commento e che il grep
  > conta. Le due frasi dicono ora la stessa cosa con le parole del dominio —
  > *«l'etichetta del portatore»*, *«la RPC di riserva»* — e il gate misura cio'
  > che intende misurare invece di essere aggirato.

## Threat Model — le cinque mitigazioni, verificate

| ID | Mitigazione | Come e' verificata |
|---|---|---|
| **T-50-11** | indice unico **parziale**, l'unicita' non si indebolisce | `pg_indexes` porta `WHERE (sumup_checkout_id IS NOT NULL)`; la **sonda A** ha ricevuto `23505` sul checkout doppio |
| **T-50-12** | la RPC non e' concessa ad `anon` ne' ad `authenticated` | `proacl` identico in tre letture; zero `GRANT`/`REVOKE` nel file |
| **T-50-13** | niente richieste quotidiane a SumUp per checkout inesistenti | i due biglietti emessi hanno `sumup_checkout_id` **nullo**: `reconcile-refunds/route.ts:105` esce con `continue` |
| **T-50-14** | nessuna seconda strada per creare livelli da un percorso pubblico | il livello nasce dalla serata (riempimento qui, aggancio nel 50-04); il `COMMENT ON TABLE` letto dal catalogo lo dichiara |
| **T-50-15** | il nome non finisce sul biglietto ne' alla porta | `buyer_name` e' **sull'ordine**; `holder_label` dei due biglietti e' `1 di 2` / `2 di 2`; grep `holder_label` a 0 sul corpo |
| **T-50-SC** | nessun pacchetto installato | `package.json` e `package-lock.json` non compaiono nel diff |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] I `COMMENT ON` violavano i due grep di negazione del piano stesso**

- **Found during:** Task 1, eseguendo i criteri di accettazione prima di commettere
- **Issue:** Le stringhe SQL dei `COMMENT ON` nominavano `holder_label` e
  `reserve_ticket_order`. `grep -v '^\s*--'` filtra **riga per riga** e non
  riconosce una stringa SQL multilinea: quelle righe contano come codice, e i
  due gate che devono restituire 0 restituivano 1 ciascuno.
- **Fix:** le stesse frasi riscritte con le parole del dominio — *«l'etichetta
  del portatore»* e *«la RPC di riserva»* — lasciando i nomi esatti dove
  servono, cioe' nei commenti `--`, che il grep esclude per costruzione.
- **Files modified:** `supabase/migrations/20260921120100_free_order.sql:167-172`, `:251-258`
- **Commit:** `5c6548a`

**2. [Rule 2 - Missing Critical] Il riempimento sul banco sarebbe stato un no-op, e un no-op non e' una misura**

- **Found during:** Task 3, leggendo lo stato del laboratorio prima di applicare
- **Issue:** `free_rsvp_senza_tier_zero` era gia' **0**: il seme del banco crea
  da se' il livello `RSVP` a 0 (`seed-lab-door.mjs:346-349`). Applicando la
  migration cosi', il riempimento avrebbe toccato **zero righe** e il SUMMARY
  avrebbe riportato «0 righe create» come se fosse una verifica — mentre non
  dimostra che l'istruzione funzioni, solo che non ha trovato niente da fare.
  E' lo stesso difetto che il 50-02 ha registrato sulla query cieca di §1.5(a3):
  **uno zero che sarebbe stato zero comunque**.
- **Fix:** due serate `free_rsvp` senza livello costruite **prima**
  dell'applicazione — una con capienza 7, una senza capienza — cosi' che il
  riempimento avesse due righe da creare e `quantity` due valori da misurare
  (7 e `NULL`). Cancellate a fine prova, con il banco riletto e riportato ai
  numeri di partenza.
- **Files modified:** nessuno nel repository (scritture sul laboratorio)
- **Commit:** —

**3. [Rule 3 - Blocking] La Management API non puo' chiamare la RPC**

- **Found during:** Task 3, preparando la prova a mano
- **Issue:** `reserve_ticket_order` e' concessa al solo `service_role`;
  l'endpoint `/database/query` gira come `supabase_read_only_user` (misurato con
  `current_user`, non supposto). La chiamata sarebbe tornata `42501`, come nel
  50-02 su `reconcile_master` — e quel rifiuto e' la **conferma** che il
  permesso e' quello giusto, non un ostacolo da aggirare.
- **Fix:** la RPC chiamata da **PostgREST** con `LAB_SUPABASE_SERVICE_ROLE_KEY`,
  che e' il perimetro previsto — lo stesso da cui la chiama il webhook. Nessun
  `GRANT` aggiunto, nemmeno temporaneo.
- **Files modified:** nessuno nel repository
- **Commit:** —

### Cio' che il piano prevedeva e che NON e' stato fatto

Niente. I tre task sono completi.

## Debito e note per chi viene dopo

- **`seed-lab-door.mjs` crea il livello `RSVP` a 0 da se'** (`:346-349`). Dopo
  il piano 50-04, quando il livello nascera' dalla creazione della serata, quella
  riga del seme sara' una **seconda strada** verso lo stesso oggetto: innocua
  oggi (il `NOT EXISTS` della migration la tollera), ma da guardare quando il
  50-04 aggancia la creazione — o il banco smettera' di provare il percorso vero.
- **Il numero su `ticket_tiers.quantity` e' una COPIA della capienza della
  serata, presa una volta.** Se l'organizer cambia `event_parties.capacity` dopo,
  i due numeri divergono e **vince il livello**, perche' e' lui che la RPC legge.
  Tenerli allineati e' lavoro del piano 50-04, ed e' scritto nella migration
  (`:198-200`) perche' non venga scoperto dopo.
- **Nessuna rete di compilazione sul percorso nuovo**: vedi la nota in fondo a
  «I tipi, nello stesso commit».

## Threat Flags

Nessuna superficie nuova fuori dal `<threat_model>` del piano: questa migration
non aggiunge endpoint, non tocca RLS e non cambia alcun permesso. La sola
superficie che apre — un ordine senza checkout — e' il registro T-50-11/T-50-13,
gia' coperto.

## Known Stubs

Nessuno. Le due colonne e il livello a prezzo zero sono applicati e riletti dal
catalogo; il percorso che li usa e' il piano 50-04, dichiarato nel piano e nella
migration, non uno stub lasciato indietro.

## Self-Check: PASSED

| Cosa | Esito |
|---|---|
| `supabase/migrations/20260921120100_free_order.sql` | **esiste** |
| `.planning/phases/50-via-le-iscrizioni/50-03-SUMMARY.md` | **esiste** |
| commit `5c6548a` (migration + tipi) | **presente in `git log`** |
| commit `c388119` (questo SUMMARY) | **presente in `git log`** |
| `git diff --diff-filter=D d4033eb..HEAD` | **vuoto** — nessun file cancellato |
| `STATE.md` / `ROADMAP.md` | **non toccati**: li scrive l'orchestratore a onda chiusa |
