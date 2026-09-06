---
phase: 49-comprare-senza-account
plan: 01
subsystem: ticketing
tags: [schema, idempotenza, rls, security-definer, produzione, migration]

requires:
  - phase: 6-ticketing
    provides: "tickets, pending_purchases, reserve_ticket — e il vincolo sumup_checkout_id UNIQUE che questo piano sposta"
  - phase: 9-drinks
    provides: "drink_orders -> fulfill_drink_order -> N drink_tokens: la forma ordine/righe gia' esercitata in produzione"
provides:
  - "public.ticket_orders con RLS: un checkout SumUp, N biglietti, e l'idempotenza del pagamento tenuta dallo SCHEMA"
  - "public.reserve_ticket_order(uuid, text): N biglietti in una transazione, ripetibile, con tetto e capienza autoritativi"
  - "tickets.order_id / holder_label / issued_via"
  - "event_parties.max_tickets_per_order NOT NULL DEFAULT 6"
  - "I due indici unici parziali ristretti a order_id IS NULL: il percorso con sessione tiene la sua rete"
affects: [49-02, 49-03, 49-04, 49-05, 49-06, 49-07, 49-08, 49-09, 49-10, 49-11]

tech-stack:
  added: []
  patterns:
    - "Split ordine/righe: l'unicita' del checkout si SPOSTA su una tabella che ha davvero un checkout solo, invece di allentarsi"
    - "Indice unico ristretto per percorso (order_id IS NULL): due strade convivono, ognuna con la sua garanzia"
    - "REVOKE ALL / GRANT service_role su ogni SECURITY DEFINER che muove denaro"
    - "Importo per riga diviso in centesimi con resto alle prime righe: sum(amount_paid) = total_amount esattamente"

key-files:
  created:
    - supabase/migrations/20260905120000_ticket_orders.sql
    - supabase/migrations/20260905120100_reserve_ticket_order.sql
    - .planning/phases/49-comprare-senza-account/deferred-items.md
  modified:
    - src/types/database.ts
    - .planning/phases/49-comprare-senza-account/49-AUTHORISATION.md

key-decisions:
  - "L'unicita' non si toglie, si sposta: ticket_orders.sumup_checkout_id UNIQUE NOT NULL e' l'idempotenza del pagamento, e vive dove e' vera"
  - "I due indici unici parziali si RICREANO con order_id IS NULL invece di essere solo rimossi: reserve_ticket cerca il duplicato senza FOR UPDATE, quindi quegli indici sono l'unica rete del percorso con sessione"
  - "ticket_orders.user_id nullabile: l'identita' nasce al webhook, non al carrello"
  - "tickets.order_id e' ON DELETE SET NULL e non CASCADE: nessuna cascata nuova, e il progetto non ha PITR"
  - "reserve_ticket_order revocata a public/anon/authenticated e concessa a service_role: senza, era una primitiva di conio biglietti sulla chiave anonima"
  - "L'importo per riga si divide in centesimi con resto: una divisione arrotondata lascia incasso che nessuna riga rappresenta"
  - "Il tetto e' PER ORDINE e non per persona, ed e' dichiarato in tre posti — colonna, tipo, RPC"

requirements-completed: [BUY-01, BUY-02]

duration: 42min
completed: 2026-09-06
---

# Fase 49 Piano 01: L'ordine, il tetto, l'attribuzione, l'etichetta — Summary

**Un checkout SumUp puo' ora produrre sei biglietti senza che l'idempotenza del
pagamento si sposti di un centimetro dallo schema al codice — e il percorso con
sessione, che questa fase dichiara di non toccare, esce con la sua unica rete
ancora al suo posto invece che tolta in silenzio.**

## Performance

- **Duration:** ~42 min
- **Tasks:** 3 / 3
- **Migration applicate in produzione:** 2 / 2 — nessuna fallita, nessuna fermata
- **Righe scritte in produzione:** **0** (due `ALTER`, una `CREATE TABLE`, una
  `CREATE FUNCTION` — nessun `INSERT`, nessun `DELETE`)

## Cosa e' stato fatto

### Il vincolo che bloccava `BUY-01`, e perche' non e' stato semplicemente tolto

`tickets.sumup_checkout_id text UNIQUE`
(`20260225110000_phase6_ticketing.sql:28`) impediva a un solo pagamento di
produrre piu' di un biglietto. **Non era decorativo:** era la ragione per cui una
seconda consegna di `CHECKOUT_STATUS_CHANGED` non poteva emettere un secondo
biglietto.

L'unicita' e' stata **spostata**, non allentata: vive su
`ticket_orders.sumup_checkout_id text UNIQUE NOT NULL`, cioe' su una tabella che
ha davvero un checkout solo. Dopo la migration esiste ancora un punto dello
schema dove due consegne dello stesso webhook si scontrano — che e' la prova che
lo spostamento non e' una rinuncia.

`tickets.sumup_checkout_id` resta come colonna, con un indice **non** unico al
posto del vincolo: ha due lettori reali in
`src/app/api/cron/reconcile-refunds/route.ts:101` e `:110-111`, verificati
ancora presenti e invariati dopo il lavoro.

### Il sotto-passo (d-bis), che era il difetto vero del piano prima della revisione

`public.reserve_ticket` (`20260310100000_discount_codes.sql:113-124`) cerca un
biglietto duplicato con un `SELECT ... INTO` **senza `FOR UPDATE`**: due
transazioni concorrenti lo superano entrambe. La sola cosa che impediva a due
consegne dello stesso webhook di produrre **due biglietti da un solo pagamento**
erano `tickets_party_user_unique` e `tickets_event_user_master_unique` — e
`pending_purchases` non copre il caso, avendo un vincolo unico solo su
`sumup_checkout_id`, che riguarda la creazione del checkout e non la consegna
duplicata che ne segue.

I due indici sono stati **droppati e ricreati** con `AND order_id IS NULL`.
Il discrimine e' esatto: il percorso vecchio lascia `order_id` nullo — non
conosce quella colonna — il percorso nuovo la valorizza sempre.

**Riletto dal catalogo dopo l'applicazione**, `pg_indexes`:

```
tickets_party_user_unique
  CREATE UNIQUE INDEX ... ON public.tickets USING btree (party_id, user_id)
  WHERE ((party_id IS NOT NULL) AND (order_id IS NULL))

tickets_event_user_master_unique
  CREATE UNIQUE INDEX ... ON public.tickets USING btree (event_id, user_id)
  WHERE ((party_id IS NULL) AND (order_id IS NULL))
```

### La RPC

`public.reserve_ticket_order(p_order_id uuid, p_issued_via text DEFAULT
'guest_checkout') RETURNS SETOF uuid`, `SECURITY DEFINER`, `SET search_path = ''`.
Nome diverso da `reserve_ticket` apposta: un quarto overload di una funzione che
in produzione ne ha gia' tre avrebbe reso ambigua la risoluzione nel punto in cui
passa il denaro.

Sequenza: ordine `FOR UPDATE` -> ramo d'uscita se `completed` -> portatore
presente -> tetto per serata (default 6 se l'ordine non ha `party_id`) -> tier
`FOR UPDATE` con `venduti + quantity > capienza` -> codice sconto contando
`quantity` usi -> **una sola `INSERT` con `generate_series`** -> `status =
'completed'`.

## Verifica — evidenza, non aggettivi

> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test` e non esiste alcun `*.test.*`. Niente qui e' verificato perche' «i test
> passano». La verifica automatica e' `npm run build` (che e' anche il typecheck
> di Next), il resto e' lettura del catalogo e procedura manuale scritta.

### Conteggi PRIMA di scrivere — il cancello del task 3

Letti dal catalogo il **2026-09-06 alle 14:10 UTC**, prima di qualunque
applicazione. Il task si sarebbe fermato se uno solo non fosse stato zero, perche'
l'intero calcolo del rischio della fase poggia su questa misura.

| Tabella | Righe | Esito |
|---|---|---|
| `public.tickets` | **0** | cancello aperto |
| `public.pending_purchases` | **0** | cancello aperto |
| `public.drink_orders` | **0** | cancello aperto |
| `public.event_parties` | 3 | atteso: tutte e tre prendono il default |

Stato del catalogo prima: `public.ticket_orders` **assente**; `tickets` senza
`order_id` / `holder_label` / `issued_via`; `event_parties` senza
`max_tickets_per_order`; `reserve_ticket_order` **assente**;
`public.reserve_ticket` in **tre** overload; i quattro indici unici su `tickets`
esattamente come dichiarati.

### Le due applicazioni

Attraverso `POST /v1/projects/{ref}/database/migrations` — **mai**
`/database/query` — cosi' la storia delle migration resta veritiera.

| # | File | Applicata (UTC) | HTTP | Versione registrata |
|---|---|---|---|---|
| 1 | `20260905120000_ticket_orders.sql` | 2026-09-06 14:11:54 | 200 | `20260906141154` / `ticket_orders` |
| 2 | `20260905120100_reserve_ticket_order.sql` | 2026-09-06 14:12:23 | 200 | `20260906141223` / `reserve_ticket_order` |

Nessuna delle due ha fallito, quindi la regola *«se una fallisce ci si ferma»*
non e' stata esercitata.

### La rilettura, presa dal catalogo e non dalla risposta del `POST`

Ogni riga sotto viene da `pg_class`, `pg_policies`, `pg_indexes`,
`pg_constraint`, `pg_proc` o `information_schema.columns`. La risposta di
entrambe le `POST` era `[]`, e una misura presa con lo strumento che ha causato
l'effetto e' un'eco.

| Cosa | Letto da | Risposta |
|---|---|---|
| `public.ticket_orders` esiste, RLS abilitata | `pg_class.relrowsecurity` | `true` |
| Le sue policy | `pg_policies` | **una sola**: `ticket_orders_select_own \| {authenticated} \| SELECT \| (auth.uid() = user_id)` — **nessuna per `anon`** |
| Le sue 15 colonne | `information_schema.columns` | `user_id` **nullabile**, `buyer_email` NOT NULL, `sumup_checkout_id` NOT NULL |
| `tickets.order_id`, `holder_label`, `issued_via` | `information_schema.columns` | tutte e tre presenti, **nullabili, senza default** |
| `tickets.order_id` non introduce cascate | `pg_constraint` | `tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES ticket_orders(id) ON DELETE SET NULL` |
| Vincolo unico su `tickets.sumup_checkout_id` | `pg_constraint` (`contype='u'`) | **zero vincoli unici su `tickets`** — `tickets_sumup_checkout_id_key` non c'e' piu' |
| Il suo sostituto non unico | `pg_indexes` | `CREATE INDEX idx_tickets_sumup_checkout_id ON public.tickets USING btree (sumup_checkout_id)` |
| I due indici parziali ristretti | `pg_indexes` | entrambi presenti, **entrambi con `order_id IS NULL` nella definizione** (testo sopra) |
| `event_parties.max_tickets_per_order` | `information_schema.columns` | `is_nullable = NO`, `column_default = 6` |
| Le righe che esistevano gia' | `select max_tickets_per_order, count(*) ... group by 1` | **`6` -> 3 serate**. Nessuna riga con un altro valore, nessuna a NULL |
| `public.reserve_ticket_order` | `pg_proc` | esiste, `prosecdef = true`, `proconfig = {"search_path=\"\""}` |
| Chi puo' chiamarla | `pg_proc.proacl` | `{postgres=X/postgres, service_role=X/postgres}` — **niente `=X` (PUBLIC), niente `anon`, niente `authenticated`** |

### Il ri-conteggio contro 2241

L'istantanea del 2026-09-06 14:00:55 UTC **non e' stata ripresa**, come
prescritto. L'insieme delle 35 tabelle e' stato invece **ri-derivato in modo
indipendente** — chiusura transitiva sulle chiavi esterne di `pg_constraint` a
partire da `tickets`, `event_parties`, `profiles`, `events` — per verificare che
la misura fosse riproducibile prima di usarla come riferimento.

| Momento | Tabelle | Righe |
|---|---|---|
| Prima delle due applicazioni | **35** | **2241** |
| Dopo le due applicazioni | **36** | **2241** |

**Le righe non si sono mosse di una.** Le 15 tabelle non vuote coincidono voce
per voce, prima e dopo, con quelle dichiarate nell'istantanea:
`drink_items=7, event_parties=3, events=2, formats=4, membership_acts=2,
party_series=5, production_checklist_item=92, production_lineup_slot=12,
production_piece=59, production_pipeline_rule=14, production_plan=12,
production_space=184, production_space_attribute=1840, profiles=4,
ticket_tiers=1`.

**La tabella in piu' e' `public.ticket_orders`, ed e' vuota.** Non e' una
differenza da sistemare: e' esattamente la distinzione che il gate *un'istantanea
prima copre cio' che si tocca, non cio' che si crea* pone. Il conteggio delle
tabelle sale perche' la nuova entra nella chiusura per chiave esterna; il
conteggio delle righe, che e' la misura che protegge, non si muove.

### Build

`npm run build` -> **exit 0**, eseguito due volte: dopo le modifiche ai tipi e di
nuovo dopo l'applicazione delle migration.

## Cosa NON e' stato verificato, e va detto

**L'idempotenza di `reserve_ticket_order` non e' stata provata eseguendola.**
Provarla richiederebbe **creare righe in produzione** — un ordine, e i biglietti
che ne nascono — e questo e' **fuori dal perimetro dell'autorizzazione del
2026-09-06**, che copre esattamente due file di migration e nomina «righe
seminate» fra le scritture escluse. L'autorizzazione non si allarga da se'.

Quello che esiste e' il ramo, leggibile: `20260905120100_reserve_ticket_order.sql`
righe 76-83. Quello che manca e' la prova, e **la prova va fatta**, non
dimenticata. La procedura, scritta perche' e' l'unica che esistera':

> **P1 — l'ordine ripetuto.** Su un ambiente dove si possono creare righe, con
> un tier che ha almeno sei posti liberi: inserire un `ticket_orders` con
> `quantity = 6`, `status = 'pending'` e un `user_id` risolto. Chiamare
> `reserve_ticket_order(<id>)`. **Attendere:** sei uuid, sei righe in `tickets`
> con `order_id` valorizzato e `holder_label` da `1 di 6` a `6 di 6`, e
> `ticket_orders.status = 'completed'`. Chiamarla **una seconda volta con lo
> stesso id**. **Attendere:** gli **stessi** sei uuid, nello stesso ordine, e
> `select count(*) from tickets where order_id = <id>` ancora **6**. Un sette
> qualsiasi e' il fallimento.
>
> **P2 — la somma degli importi.** Sullo stesso ordine, con
> `total_amount = 10.00` e `quantity = 3`:
> `select sum(amount_paid) from tickets where order_id = <id>` deve dare
> **esattamente 10.00**, non 9.99.
>
> **P3 — il tetto.** Un ordine con `quantity = 7` su una serata a 6 deve far
> sollevare un'eccezione **prima** di qualunque inserimento:
> `select count(*) from tickets where order_id = <id>` deve restare **0**.
>
> **P4 — la capienza non riesce a meta'.** Un tier con **due** posti liberi e un
> ordine da sei: eccezione, e **zero** righe inserite. Non due.
>
> **P5 — la vecchia rete regge ancora.** Chiamare `reserve_ticket` **due volte**
> con gli stessi `p_user_id` e `p_party_id`: la seconda deve fallire. Se
> riuscisse, la restrizione `order_id IS NULL` non sta facendo il suo lavoro ed
> e' il difetto che questo piano esisteva per evitare.

## Deviazioni dal piano

### 1. [Rule 3 — conflitto di gate] `CREATE TABLE IF NOT EXISTS` contro il criterio d'accettazione

- **Trovato durante:** task 1.
- **Il conflitto:** il testo del task chiede *«una migration idempotente (`IF NOT
  EXISTS` / `IF EXISTS`, convenzione del repo)»*; il suo primo criterio
  d'accettazione chiede il literal `CREATE TABLE public.ticket_orders`, che
  `IF NOT EXISTS` spezza. Il task contraddice se stesso.
- **Risolto:** vince l'idempotenza — `supabase-data.md`, gate *idempotenza DDL*,
  piu' `meta-gates.md`, *«se due gate producono requisiti contraddittori vince il
  piu' restrittivo»*. Il criterio e' un proxy testuale; l'idempotenza e' una
  proprieta' operativa reale, e una migration che fallisce alla seconda
  esecuzione blocca un deploy in un momento scomodo.
- **Criterio equivalente da usare al suo posto:**
  `grep -cE "CREATE TABLE IF NOT EXISTS public\.ticket_orders"` -> **1**.
- **Commit:** `92b5caa`.

### 2. [Rule 2 — funzionalita' critica mancante] `REVOKE` / `GRANT` su `reserve_ticket_order`

- **Trovato durante:** task 2, leggendo la convenzione del repo prima di scrivere.
- **Il buco:** Postgres concede `EXECUTE` a `PUBLIC` su ogni funzione nuova, e
  PostgREST espone ogni funzione di `public` su `/rest/v1/rpc/`. Senza revoca,
  `reserve_ticket_order` sarebbe stata chiamabile **con la sola chiave anonima** —
  ed essendo `SECURITY DEFINER`, la RLS non la ferma. Chi conosce o indovina
  l'uuid di un ordine `pending` si fa emettere i biglietti di un checkout mai
  pagato.
- **Perche' il piano non lo vedeva:** il registro T-49-03 mitiga
  `SECURITY DEFINER` con `search_path`, un parametro solo e i valori riletti —
  tutte cose giuste, tutte sul *cosa fa*, nessuna sul *chi puo' chiamarla*.
- **Fix:** `REVOKE ALL ... FROM public, anon, authenticated` seguito da
  `GRANT EXECUTE ... TO service_role`, la coppia che il repo applica gia' a
  `reconcile_master`, `record_venue_reveal_act` e `record_checklist_tick`.
- **Verificato:** `pg_proc.proacl` = `{postgres=X/postgres, service_role=X/postgres}`.
- **Commit:** `9e365bc`.

### 3. [Rule 2 — correttezza sul denaro] L'importo per riga si divide in centesimi

- **Trovato durante:** task 2, scrivendo l'`INSERT`.
- **Il difetto:** il piano prescrive `amount_paid` = *«il totale diviso per la
  quantita'»*. Una divisione arrotondata **non torna**: 10,00 su 3 da' 3,33 tre
  volte, cioe' 9,99. Il centesimo mancante e' incasso che nessuna riga
  rappresenta — quindi denaro che un rimborso totale non restituisce, e
  `ticket_refunds.amount` e' **per riga**.
- **Fix:** divisione in centesimi interi con il resto assegnato alle prime righe.
  `sum(amount_paid) = total_amount` esattamente, per ogni quantita'.
- **Commit:** `9e365bc`. **Prova da eseguire:** P2 sopra.

### 4. [Rule 2 — zero fallimenti silenziosi] `RAISE` esplicito su ordine senza portatore

- **Trovato durante:** task 2. `ticket_orders.user_id` e' nullabile, `tickets.user_id`
  e' `NOT NULL`: senza controllo, il fallimento arriva come violazione di vincolo,
  con un messaggio che non dice cosa e' mancato. Non esiste error tracking in
  questo progetto.
- **Fix:** eccezione con messaggio distinguibile, prima dell'`INSERT`.
- **Commit:** `9e365bc`.

## Scoperte fuori perimetro — registrate, non riparate

Entrambe in
`.planning/phases/49-comprare-senza-account/deferred-items.md`.

### `public.reserve_ticket` e' chiamabile con la chiave anonima

Letto da `pg_proc` **dopo** l'applicazione, guardando l'ACL della funzione nuova
e quindi anche quella delle vecchie. Tutti e **tre** gli overload hanno
`prosecdef = true`, `proconfig = null` (**nessun `SET search_path`**) e
`proacl = {=X/postgres, postgres=X/postgres, anon=X/postgres,
authenticated=X/postgres, service_role=X/postgres}`. `=X` e' `EXECUTE` a
`PUBLIC`.

`reserve_ticket` riceve **tutti** i valori che decidono dal chiamante — chi
compra, quale tier, quanto ha pagato — e non ne rilegge nessuno.

**Non e' causato da questo piano e non e' peggiorato da questo piano.** Ma e' la
conferma sul campo che (d-bis) non era una precauzione teorica: un biglietto
coniato per quella strada lascia `order_id` nullo, quindi ricade **ancora** sotto
i due indici parziali ricreati, e il tetto resta un biglietto per conto per
serata. Se fossero stati solo tolti, non ci sarebbe alcun tetto.

Fuori dall'autorizzazione, che nomina due file. Decisione e riparazione: fasi
50/51 — **oppure prima, se la milestone apre le vendite prima di quelle fasi**,
perche' da quel momento un biglietto coniato gratis e' un posto sottratto a chi
paga.

### `tickets_notify_attendance` scatta sei volte per un ordine da sei

`20260811120000_live_attendance_channel.sql:384-387` e' `FOR EACH ROW`. Una sola
`INSERT` da sei righe produce sei notifiche identiche alla stessa serata. La
funzione «non scrive nulla e restituisce NULL», quindi non puo' alterare,
ritardare o far fallire un acquisto: e' rumore, non un errore. Registrato perche'
chi guardera' il canale della porta durante una vendita di gruppo vedra' una
raffica e deve sapere da dove viene.

## Cosa questo piano NON ha fatto, per scelta dichiarata

- **`pending_purchases` e `reserve_ticket` non sono state toccate.** Le due
  strade convivono: quella con sessione la chiudono le fasi 50/51. Non e' una
  superficie mezza convertita — sono due percorsi completi, ognuno con la sua
  idempotenza.
- **Nessuna policy per `anon` su `ticket_orders`.** La strada dell'ospite passa
  dal client di servizio, dopo la verifica della firma del webhook.
- **Nessuna policy di lettura per organizer e master su `ticket_orders`.** La
  dashboard delle vendite legge `tickets`, che ha gia' `tickets_select_admin`. Se
  servira', sara' una policy nuova con la sua ragione, non un allargamento
  silenzioso di quella esistente.
- **Il tetto e' per ORDINE, non per persona.** Sei ordini da sei sono trentasei
  biglietti e niente qui lo impedisce. E' il perimetro di `BUY-02`, scritto in
  tre posti — il `COMMENT` della colonna, il tipo, il commento della RPC —
  perche' un perimetro non dichiarato e' indistinguibile da un buco.

## Nota sulla storia delle migration

La versione registrata **non e' il timestamp del file**: l'endpoint conia la
versione con l'istante dell'applicazione. I file sono `20260905120000` e
`20260905120100`, la storia registra `20260906141154` e `20260906141223`. Non e'
una deriva ne' un errore — e' come si comporta l'endpoint — ma chi cerchera'
domani una di queste due in `supabase_migrations.schema_migrations` **per il
numero del file non la trovera'**, e merita saperlo prima di concluderne che
manca. Registrato anche in `49-AUTHORISATION.md`.

## Self-Check

File creati — verificati esistenti sul disco:

- `supabase/migrations/20260905120000_ticket_orders.sql` — FOUND
- `supabase/migrations/20260905120100_reserve_ticket_order.sql` — FOUND
- `.planning/phases/49-comprare-senza-account/deferred-items.md` — FOUND

Commit — verificati in `git log`:

- `92b5caa` — `feat(49-01): un checkout, N biglietti — l'unicita' si sposta, non si allenta` — FOUND
- `9e365bc` — `feat(49-01): reserve_ticket_order — N biglietti in una transazione, ripetibile` — FOUND

Oggetti in produzione — verificati dal catalogo, non dalla risposta del `POST`:
`ticket_orders` FOUND · policy `ticket_orders_select_own` FOUND · `tickets.order_id`
`holder_label` `issued_via` FOUND · `event_parties.max_tickets_per_order` default 6
FOUND · i due indici parziali con `order_id IS NULL` FOUND · vincolo unico su
`tickets.sumup_checkout_id` ASSENTE (atteso) · `reserve_ticket_order` FOUND con
ACL ristretta.

## Self-Check: PASSED
