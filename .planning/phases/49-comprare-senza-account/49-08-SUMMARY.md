---
phase: 49-comprare-senza-account
plan: 08
subsystem: ticketing-payments / nextjs-architecture
tags: [guest-purchase, quantita, tetto-per-serata, maybeSingle, bearer-ticket, no-name]

requires:
  - phase: 49-01
    provides: "event_parties.max_tickets_per_order (NOT NULL DEFAULT 6, CHECK > 0), tickets.holder_label, i due indici unici ristretti a order_id IS NULL"
  - phase: 49-04
    provides: "purchaseTicketsGuest — il checkout senza sessione, con i rifiuti come valore di ritorno"
  - phase: 49-06
    provides: "il ritorno dal pagamento che riconosce ctx=ticket_order e porta ai codici senza sessione"
  - phase: 49-07
    provides: "il webhook che trasforma l'ordine in N biglietti e conia l'identita' dietro l'incasso"
provides:
  - "la pagina della serata elenca TUTTI i biglietti di chi guarda, invece di leggerne uno solo con maybeSingle"
  - "quantita' e indirizzo mail nella selezione del tier — la strada senza account arriva al pagamento"
  - "il tetto per serata modificabile da chi organizza, con «per ordine, non per persona» scritto accanto"
affects: [49-09, 49-11, 50, 51]

tech-stack:
  added: []
  patterns:
    - "Un campo che il percorso non onora non si mostra: la quantita' appare solo sulla strada dove arriva al database"
    - "Vuoto significa «lascia com'e'» e viaggia come chiave assente, non come null, quando la colonna e' NOT NULL con default"
    - "Il fallback di un tetto letto male e' 1 e non il default di prodotto: cosi' il numero conserva una casa sola"

key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/components/events/EventForm.tsx
    - src/app/(admin)/admin/events/actions.ts
    - src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx
    - .planning/phases/49-comprare-senza-account/deferred-items.md

key-decisions:
  - "Il controllo d'acquisto resta nascosto a chi ha gia' un biglietto: la strada con sessione porta tre rifiuti di duplicato che questa fase non tocca, e offrirle l'acquisto sarebbe offrire un rifiuto"
  - "Nessun selettore di quantita' sulla strada con sessione: un controllo il cui valore non arriva da nessuna parte e' teatro quanto il campo del nome"
  - "Il pass di evento non ha strada d'ospite e la superficie lo dice, invece di aprire un checkout rifiutato con «serata non trovata»"
  - "Su lettura dei biglietti fallita l'elenco resta vuoto e il controllo resta vivo — la pagina non rifiuta chi compra (46-FINDING-01)"

requirements-completed: [BUY-01, BUY-02, BUY-03]

duration: ~50min
completed: 2026-09-06
---

# Fase 49 Piano 08: le superfici — Summary

**Da oggi una persona senza account sceglie quanti biglietti vuole entro il
tetto della serata, scrive un indirizzo e arriva al pagamento senza passare da
una registrazione; chi ne ha piu' di uno li vede tutti invece di sentirsi
riproporre l'acquisto; e chi organizza cambia il tetto dalla stessa schermata in
cui configura la serata, leggendo accanto al campo che e' per ordine e non per
persona.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3 / 3
- **Commit:** 3
- **Righe scritte in produzione: 0.** Nessuna migration, nessun `INSERT`,
  nessuna sessione coniata. Le uniche interrogazioni al database sono **letture**
  (`event_parties`, `tickets`, `ticket_orders`, `ticket_tiers`, `events`),
  esplicitamente permesse.

| Commit | Task | File |
|---|---|---|
| `06fc7ca` | 1 | `page.tsx`, `TierSelection.tsx` (solo il prop) |
| `24ae6fa` | 2 | `TierSelection.tsx` |
| `06e6c4d` | 3 | `EventForm.tsx`, `admin/events/actions.ts`, `events/[id]/edit/page.tsx`, `deferred-items.md` |

---

## Cosa e' cambiato, superficie per superficie

### 1. La pagina della serata — `src/app/(public)/events/[slug]/page.tsx`

| Cosa | Dove | Prima → dopo |
|---|---|---|
| Il tipo del campo | `:158` | `userTicket: {…} \| null` → `userTickets: { id, holder_label }[]` |
| La lettura per serata | `:661-696` | `.select("id, tier_id").eq(…).maybeSingle()` con errore **scartato** → `.select("id, holder_label").eq(…)`, errore **letto**, elenco ordinato numericamente |
| La lettura del pass di evento | `:576-590` | `.maybeSingle()` → `.limit(1)`, errore letto |
| Il tetto nel payload | `:538`, `:786-790` | `max_tickets_per_order` entra nella select e viaggia a `TierSelection` |
| Il riquadro «hai un biglietto» | `:1585-1642` | una riga e un collegamento → **un collegamento per biglietto**, etichettato `holder_label` |
| La condizione del pass coperto | `:1644` | `!party.userTicket` → `party.userTickets.length === 0` |
| La condizione del controllo d'acquisto | `:1676` | idem, **con la ragione scritta accanto** (`:1655-1675`) |

**Perche' non era un ritocco.** Con piu' righe PostgREST **risponde con un
errore** a `maybeSingle`, e quell'errore era scartato (`const { data: ticket }`).
Il risultato era `null`, cioe' *questa persona non ha biglietti*, cioe' il
controllo d'acquisto riproposto a chi ne ha sei — **un guasto silenzioso con una
faccia neutra, sul percorso del denaro**.

Il singolare descriveva un mondo reale fino a stamattina: due indici unici
parziali garantivano un biglietto per persona per serata. La migration
`20260905120000_ticket_orders.sql:231-238` li ha **ricreati ristretti a
`order_id IS NULL`**. La strada con sessione tiene la sua garanzia; un ordine ne
porta fino a sei.

**Anche la lettura del pass di evento e' stata convertita**, e non era chiesta
esplicitamente: `tickets_event_user_master_unique` e' stato ristretto alla stessa
condizione, quindi la garanzia di una riga sola non esiste piu' li' nemmeno. Oggi
il caso non e' raggiungibile — `buildOrderQuote` pretende un `partyId`, quindi
nessun ordine nasce senza serata — ma **una query che si affida a una garanzia
rimossa e' una query rotta che nessuno vede**.

**`holder_label` non e' un nome, ed e' la ragione per cui compare.** La colonna
porta «n di N» — il progressivo dentro l'ordine — e il suo `COMMENT` vieta
esplicitamente che diventi un nome (`D-49-03`). Un biglietto nato dalla strada
con sessione ce l'ha `NULL`: allora si scrive la frase che c'era, e **non si
fabbrica un «1 di 1»**, che sarebbe un dato di oggi scritto dentro un fatto di
ieri.

**L'ordinamento e' numerico e non alfabetico** (`:686-694`): su un ordine da
dodici, `'10 di 12'` precede `'2 di 12'` in ordine di testo. E' la stessa
correzione che `reserve_ticket_order` applica al proprio `RETURN QUERY`, qui
perche' la lista si legge.

### 2. La selezione del tier — `src/app/(public)/events/[slug]/TierSelection.tsx`

| Cosa | Dove |
|---|---|
| Il rimbalzo a `/register` | **rimosso** — `grep -c '/register'` = **0** |
| La chiamata senza sessione | `:389-403` — `purchaseTicketsGuest` |
| La strada con sessione | `:414-425` — `purchaseTicket`, **argomento per argomento com'era** |
| Il selettore di quantita' | `:591-616` — da 1 a `cap`, che viene dalla serata |
| L'indirizzo mail | `:618-632` |
| Il tetto, e la sua natura consultiva | `:36-42` (commento), `:148` (prop), `:307-309` |
| Perche' nessun nome | `:13-35` — sopra il modulo, come il piano chiedeva |
| I due esiti di successo | `:698-728` |

**Il muro abbattuto.** Il ramo `!isAuthenticated` salvava un'intenzione in
`localStorage` e mandava alla registrazione. Una persona che non ci conosce,
davanti a una serata, doveva **prima farsi un account per poter pagare**. Adesso
paga, e nessun account nasce qui: l'identita' la conia il webhook dietro un
incasso verificato (49-07).

### 3. Il modulo della serata — `src/components/events/EventForm.tsx` + le due azioni

| Cosa | Dove |
|---|---|
| Il campo, percorso a piu' serate | `EventForm.tsx:1287-1298` |
| Il campo, percorso a serata unica | `EventForm.tsx:1617-1627` |
| Lo stato | `:118`, `:144`, `:245`, `:373-377` |
| I due payload | `:585-587`, `:625-627` |
| Il tipo dell'input dell'azione | `actions.ts:85-94` |
| La validazione | `actions.ts:507-542` |
| La scrittura in **creazione** | `actions.ts:818-820` |
| La scrittura in **aggiornamento** | `actions.ts:1081-1083` |
| La lettura per il modulo di modifica | `events/[id]/edit/page.tsx:222`, `:425-432` |

---

## Come il tetto si presenta, alle due persone che lo incontrano

**A chi lo imposta** — `EventForm.tsx:1289-1298`:

- etichetta **«Tickets per order»**;
- segnaposto **«Leave empty for the default (6)»** — dichiara il default invece
  di precompilarlo. Un campo precompilato con 6 lo riscriverebbe a ogni
  salvataggio, e il numero smetterebbe di avere una casa sola;
- riga sotto: **«Per ordine, non per persona: la stessa persona puo' fare piu'
  ordini.»**

Quella riga e' `BUY-02` alla lettera, ed e' gia' nel `COMMENT` della colonna —
dove pero' la legge solo chi apre una migration. **Sei ordini da sei sono
trentasei biglietti**, e chi credesse di aver messo un limite per persona
avrebbe messo un limite che non esiste. Un perimetro non dichiarato e'
indistinguibile da un buco.

**A chi compra** — `TierSelection.tsx:596-601`: il selettore offre da 1 a `cap`,
e la riga sotto dice **«Up to N per order — not per person.»** Con un tetto a 1
la frase cambia in «One ticket per order on this night», invece di mostrare un
selettore con una sola voce e nessuna spiegazione.

---

## Come un rifiuto arriva a chi compra

**Come frase del server, intatta, nel `role="alert"` che c'era gia'**
(`TierSelection.tsx:403` → `:378-382` del render).

`purchaseTicketsGuest` restituisce `{ success: false, refusal, error }` — mai un
`throw`. Next **redige** il messaggio di un errore sollevato da una Server Action
in un build di produzione: frasi diverse arriverebbero identiche proprio dove
contano. Le venti cause distinte del preventivo restano venti; collassarle in
«Impossibile procedere» rifarebbe il difetto del form newsletter registrato in
questo progetto.

Esempi, letti dal codice del piano 49-04:

| Situazione | Cosa legge chi compra |
|---|---|
| Campo mail vuoto | *«Enter the email where your tickets should go. Nothing was charged.»* |
| Mail malformata | *«That email does not look like an email, so your tickets would have nowhere to go…»* |
| Quantita' oltre il tetto | la frase di `quote_quantity_over_cap`, che **nomina il numero della serata** e dice *per ordine* |
| Il fornitore non apre il checkout | *«The payment page could not be opened, so nothing was charged…»* |
| L'ordine non si salva | *«…we stopped before taking any payment. Nothing was charged.»* |

**Nessuna validazione di forma e' stata duplicata nel client.** La forma la
controlla il server e la frase che ne torna e' l'unica: una seconda copia sarebbe
una seconda verita' che nessuno confronta.

---

## Il debito lasciato in piedi, con i suoi `file:riga`

### I tre controlli di duplicato della strada con sessione — richiesti dal piano

| # | Dove | Cosa fa |
|---|---|---|
| 1 | `src/app/(admin)/admin/events/actions.ts:1501-1511` | rifiuta se esiste gia' un biglietto per `(party_id, user_id)` — *«You already have a ticket for this sub-event»* |
| 2 | `src/app/(admin)/admin/events/actions.ts:1513-1524` | idem per il pass di evento — *«You already have an Event Pass for this event»* |
| 3 | `supabase/migrations/20260310100000_discount_codes.sql:112-127` | dentro `public.reserve_ticket`: `RAISE EXCEPTION 'User already has a ticket for this'` |

**Nessuno dei tre e' stato toccato**, come il piano prescrive: governano la
strada con sessione, che questa fase non converte.

**Ma la conseguenza va detta, perche' e' la ragione di una scelta di render.**
Se un membro provasse a comprare un secondo biglietto, tutti e tre scatterebbero
— e i due indici unici parziali che avrebbero *spiegato* il rifiuto sono stati
ristretti stamattina. **La ragione del «no» non sarebbe evidente da nessuna
parte.** Per questo il controllo d'acquisto resta nascosto a chi ha gia' un
biglietto (`page.tsx:1676`, con la spiegazione a `:1655-1675`): rendere il
controllo sarebbe rendere un rifiuto.

> **Divergenza fra il testo del piano e il suo `<done>`, dichiarata invece che
> risolta in silenzio.** L'`<action>` del task 1 dice *«si vedono i biglietti e
> si puo' comprarne altri, fino al tetto»*; il `<done>` dice *«non ripropone
> l'acquisto a chi ne ha gia'»*. **Ha vinto il `<done>`**, perche' e' l'unico dei
> due che descrive un comportamento che il codice a valle sostiene oggi. Chi non
> ha sessione non e' toccato dalla riga: il suo elenco e' vuoto per costruzione,
> il controllo si rende, e la strada d'ospite non ha nessuno dei tre rifiuti —
> **un ordine porta fino al tetto della serata in un colpo solo**, che e'
> `BUY-01` per la popolazione che questa fase esiste per servire.

Nota tecnica sul terzo: `SELECT … INTO` in plpgsql **non** e' `STRICT`, quindi
su piu' righe prende la prima senza errore. Il rifiuto non e' un guasto: e' un
rifiuto, e resta.

### `verify:touch-targets` — tre elementi rossi, nessuno di questo piano

`npm run verify` esce **1**. Tre elementi in due file che questo piano non tocca:

| File:riga | Entrato con |
|---|---|
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` | fase 47 |
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:702` | fase 47 |
| `src/emails/ticket-order.tsx:231` | `ee115a8`, piano **49-05** |

I primi due erano gia' in `D-49-06-DEF-08`. **Il terzo no**, e la voce
`DEF-08` dichiara «due» come criterio per distinguere questo rosso da uno nuovo —
un criterio che non regge piu'. Registrato come **`D-49-08-DEF-09`** in
`deferred-items.md`, con l'attribuzione **misurata**
(`git log -S'href={ticket.url}'`) e non dedotta dalla data, e con la nota che il
terzo **non e' della stessa specie**: `min-h-11` e' una classe Tailwind che
nessun client di posta applica, quindi la sua riparazione e' `padding` inline
oppure una decisione sul perimetro del gate. Nessuna delle due si prende di
passaggio.

**Nessun rosso nuovo:** i tre elementi sono gli stessi prima e dopo i commit di
questo piano.

### La lettura dei biglietti che fallisce non ha una frase

`page.tsx:680` logga con una categoria propria — `event_detail.party_user_tickets`
— e lascia l'elenco vuoto. Il controllo d'acquisto resta vivo, perche' la
decisione permanente del proprietario e' che **questa pagina non rifiuta chi
compra** (46-FINDING-01). Il costo: il collegamento ai propri biglietti non
compare, e restano raggiungibili da `/tickets`.

**Non c'e' una frase per questo caso**, e non e' una dimenticanza: le frasi di
questa pagina vengono da una lista di copy approvata in un colpo solo
(`46-COPY.md`, `D-46-10a`), e aggiungerne una e' un emendamento a quella lista,
cioe' una decisione — non un'aggiunta di passaggio. **In un repo senza error
tracking, un log non raggiunge nessuno**: il difetto resta osservabile solo a chi
guarda i log. Va chiuso da un piano che abbia quella lista nel proprio perimetro.

---

## Deviazioni dal piano

### 1. [Rule 3 — blocco] Un quarto file: la pagina di modifica non leggeva la colonna

- **Trovato durante:** task 3.
- **Il buco:** `files_modified` del piano elenca quattro file e non include
  `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx`. Ma e' li' che
  `PartyInitialData` si costruisce, e la sua `select` **non nominava**
  `max_tickets_per_order`. Il campo nuovo sarebbe stato **sempre vuoto** su una
  serata che ha un tetto, e un salvataggio l'avrebbe lasciato intatto **per
  fortuna** (vuoto = «lascia com'e'») e non per scelta — cioe' un campo che
  mente a chi organizza sul valore corrente della serata che sta configurando.
- **Fix:** colonna aggiunta alla select (`:222`) e mappata (`:425-432`).
- **Commit:** `06e6c4d`.

### 2. [Rule 2 — funzionalita' critica mancante] Anche la lettura del pass di evento usava `maybeSingle`

- **Trovato durante:** task 1, applicando alla lettera il criterio d'accettazione
  («nessuna riga che legge `.from("tickets")` filtrando per `user_id`»).
- Il piano nominava la lettura per serata. `page.tsx:576-590` faceva lo stesso
  errore sul pass di evento, e lo stesso indice unico e' stato ristretto.
- **Fix:** `.limit(1)` + errore letto.
- **Commit:** `06fc7ca`.

### 3. [Rule 2] Il pass di evento non ha una strada d'ospite, e la superficie lo dice

- **Trovato durante:** task 2. `TierSelection` si monta due volte su questa
  pagina: per una serata (`partyId` valorizzato) e per il pass di evento
  (`partyId={null}`, `page.tsx:1281`). `purchaseTicketsGuest` passa da
  `buildOrderQuote`, che **pretende un `partyId`**.
- Chiamarla con `null` avrebbe prodotto `quote_night_not_found` — *«serata non
  trovata»* su una superficie dove la serata c'e' eccome. E' il **«no» travestito
  da guasto** che il piano 49-04 ha gia' corretto una volta in questa fase
  (deviazione 5 del suo summary), rifatto un livello piu' su.
- **Fix:** `guestRoad` (`TierSelection.tsx:306`) e una frase esplicita
  (`:378-382`) che manda a scegliere una singola serata.
- **Oggi non e' raggiungibile**, misurato: l'unico `ticket_tiers` in produzione
  appartiene a una serata. La frase esiste per il giorno in cui non sara' vero.

### 4. [Decisione] Nessun selettore di quantita' sulla strada con sessione

- Il piano descrive il selettore senza condizionarlo alla sessione; l'indirizzo
  mail invece si', esplicitamente.
- **Ma la strada con sessione compra un biglietto**: `purchaseTicket` non prende
  una quantita', e il piano stesso ordina di lasciarla invariata. Un selettore
  mostrato li' avrebbe raccolto un numero che **non arriva da nessuna parte** —
  esattamente il difetto che `D-49-03` usa per rifiutare il campo del nome: *un
  dato che si chiede e poi si ignora e' peggio di un dato che non si chiede.*
- Il criterio d'accettazione del piano regge comunque:
  `grep -c 'maxTicketsPerOrder\|max_tickets_per_order'` = **6**.

### 5. [Decisione] Il fallback di un tetto illeggibile e' 1, non 6

- `page.tsx:786-790`. Nessun client Supabase di questo repository e'
  parametrizzato con `Database`: una colonna rinominata arriverebbe `undefined`
  senza rumore.
- Scrivere `?? 6` avrebbe dato al numero **una seconda casa**, che e' cio' che il
  `COMMENT` della colonna vieta citando `venue_reveal_hours` come contro-esempio
  — e avrebbe offerto sei biglietti su una serata che ne ammette due.
- Con 1 il controllo resta vivo e si compra come si comprava prima, un biglietto
  per volta. La stessa scelta a `edit/page.tsx:425-432`: **niente `?? 6`**, il
  campo mostra cio' che la serata porta, e il segnaposto dice comunque il default.

### 6. [Decisione] `undefined` e non `null` per un campo vuoto del tetto

- `capacity` manda `null` perche' li il vuoto e' uno stato reale — *nessun tetto
  di capienza*. `max_tickets_per_order` e' `NOT NULL DEFAULT 6`: `null` sarebbe
  rifiutato dal database e uno `0` coercito **cambierebbe chi entra in una
  stanza**.
- Vuoto viaggia come chiave **assente** (`EventForm.tsx:585-587`, `:625-627`), e
  la scrittura la omette (`actions.ts:818-820`, `:1081-1083`). In creazione parla
  il `DEFAULT 6`; in aggiornamento resta il valore che c'era.

---

## Registro STRIDE — cosa ne e' stato

| ID | Disposizione | Esito |
|---|---|---|
| `T-49-32` — tetto aggirato modificando la richiesta | mitigate | **mitigato e dichiarato**: il limite della UI e' consultivo e il commento sopra il modulo lo dice (`TierSelection.tsx:36-42`). L'autorita' e' `buildOrderQuote` prima del checkout e `reserve_ticket_order` dentro la transazione |
| `T-49-33` — un luogo nel payload di un componente client | mitigate | **mitigato per costruzione**: l'unica colonna aggiunta a una select e' un intero. `grep -cE 'venue_text\|venue_secret\|google_maps_url'` su `TierSelection.tsx` = **0**; `verify:venue-surfaces` **exit 0** |
| `T-49-34` — la pagina che ripropone l'acquisto a chi ha gia' comprato | mitigate | **mitigato**: `maybeSingle` sostituito da un elenco su **due** letture, non una; l'errore non e' piu' scartato |
| `T-49-35` — un nome del portatore mostrato allo staff | mitigate | **mitigato**: `grep -ciE 'full_name\|nome e cognome\|holder name'` = **0**, e la ragione sta in 22 righe sopra il modulo perche' nessuno lo aggiunga «per gentilezza», nemmeno sotto un'altra etichetta |

**Nessuna superficie di minaccia nuova.** Nessuna rotta, tabella, policy o
colonna nasce qui: nascono un campo in un modulo di lavoro e due controlli su una
pagina pubblica che gia' esisteva.

---

## Verifica — evidenza, non aggettivi

> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test` e non esiste alcun `*.test.*` o `*.spec.*`. **Niente qui e' verificato
> perche' «i test passano».**

| Controllo | Comando | Esito |
|---|---|---|
| Build + typecheck | `npm run build` | **exit 0**, dopo ciascuno dei tre task |
| Superfici del venue | `npm run verify:venue-surfaces` | **exit 0 — PASSED** |
| Aggregato | `npm run verify` | **exit 1**, per i tre elementi di `D-49-08-DEF-09` — nessuno in un file di questo piano |
| `maybeSingle` su `tickets` + `user_id` | `grep -n` | **0 occorrenze** (le due restanti sono `rsvps` e `attendance`) |
| `userTickets` in `page.tsx` | `grep -c` | **10** |
| `max_tickets_per_order` in `page.tsx` | `grep -c` | **2** |
| `purchaseTicketsGuest` in `TierSelection.tsx` | `grep -c` | **4** |
| `/register` in `TierSelection.tsx` | `grep -c` | **0** |
| Campi per un nome | `grep -ciE 'full_name\|nome e cognome\|holder name'` | **0** |
| Tetto dalla pagina, non da una costante | `grep -c 'maxTicketsPerOrder\|max_tickets_per_order'` | **6** |
| Colonne di luogo in `TierSelection.tsx` | `grep -cE 'venue_text\|venue_secret\|google_maps_url'` | **0** |
| `max_tickets_per_order` in `EventForm.tsx` | `grep -c` | **11** |
| `max_tickets_per_order` in `admin/events/actions.ts` | `grep -c` | **10**, in **entrambi** i percorsi (`:818` creazione, `:1081` aggiornamento) |
| «per ordine» accanto al campo | `grep -ci 'per ordine'` | **4** |

### Le colonne, confrontate col database invece che ricordate

**In sola lettura, il 2026-09-06**, per la ragione che il piano 49-04 ha gia'
scritto: nessun client qui e' parametrizzato con `Database`, quindi un nome
sbagliato **compila**, gira e restituisce `undefined` in silenzio.

| Letto | Esito |
|---|---|
| `event_parties.{id, title, max_tickets_per_order, access_type}` | esistono; **3 righe, tutte con tetto 6** |
| `tickets.{id, holder_label, order_id, user_id}` | esistono, selezionabili; **0 righe** |
| `ticket_orders.{id, status}` | esistono; **0 righe** |
| `ticket_tiers.{id, name, party_id, event_id, price}` | **1 riga, con serata** — quindi il ramo del pass di evento non ha tier vivi |
| `events.is_published` | **2 eventi, entrambi pubblicati** |

**Nessuna scrittura.** Nessuna riga inserita, aggiornata o cancellata; nessuna
migration; nessuna sessione coniata. L'autorizzazione di questa fase e'
`ESAURITA` e questo piano e' **codice soltanto**.

---

## Cosa NON e' verificato, e perche'

**Nessuna prova comportamentale esiste.** Esercitare queste superfici richiede un
pagamento vero e una sessione vera, cioe' righe in produzione. In produzione ci
sono **0 ordini e 0 biglietti**, quindi il ramo che elenca i biglietti **non ha
mai renderizzato dati veri**.

Le procedure da eseguire — scritte perche' sono l'unica prova che esistera':

> **P-UI-1 — la strada senza account arriva al pagamento.** In una finestra
> pulita, **senza sessione**, su una serata pubblicata con un tier in vendita:
> scegliere il tier, portare la quantita' a 2, scrivere un indirizzo valido,
> premere. **Attendere:** il pannello del fornitore si apre, e in `ticket_orders`
> **una** riga `pending` con `user_id` nullo e `quantity = 2`. Un rimbalzo a
> `/register` e' il fallimento.
>
> **P-UI-2 — il tetto limita, e la frase dice per ordine.** Sulla stessa serata,
> il selettore offre esattamente **6** voci, e sotto si legge *«Up to 6 per
> order — not per person.»* Portare il tetto della serata a **2** dal modulo, e
> ricaricare: il selettore offre **2**.
>
> **P-UI-3 — il rifiuto e' leggibile, e sono frasi DIVERSE.** Su un build di
> **produzione**, non in `next dev`: premere con il campo mail vuoto, poi con un
> indirizzo malformato. **Attendere due frasi diverse.** La stessa frase generica
> due volte significa che il valore di ritorno non sta arrivando.
>
> **P-UI-4 — sei biglietti si vedono in sei.** Con una sessione che possiede un
> ordine da sei sulla stessa serata: la pagina disegna **sei** collegamenti,
> etichettati **«1 di 6» … «6 di 6»**, in **ordine numerico**, e **non** mostra
> il controllo d'acquisto.
>
> **P-UI-5 — il tetto si salva, e vuoto non azzera.** Dal modulo: scrivere `4`,
> salvare, riaprire — il campo mostra `4`. Poi **svuotarlo**, salvare, riaprire:
> deve mostrare ancora **4**. Se mostrasse vuoto o `6`, il vuoto sta scrivendo.
>
> **P-UI-6 — il tetto a 0 e' rifiutato con una frase leggibile.** Scrivere `0` e
> salvare. **Attendere** la frase che dice *at least 1* e nomina la conseguenza,
> **non** un messaggio grezzo di Postgres sul `CHECK`.
>
> **P-UI-7 — nessun luogo in nessuna delle superfici toccate.** Su una serata
> **segreta** e **prima** della rivelazione: la pagina della serata, il pannello
> di pagamento e il ritorno dal pagamento non mostrano nessun indirizzo. E' il
> controllo che il gate **non** puo' fare al posto di una persona per il **titolo
> della serata**, che e' testo libero e che nessun predicato vede.

**Nessuna di queste e' stata eseguita, e nessuna e' stata arrotondata.**

---

## Cio' che il piano non aveva previsto

### 1. `/register` non ha piu' nessuna strada che ci porti da questa pagina

Rimuovendo il rimbalzo, l'unico percorso da una serata alla registrazione
sparisce. **E' la direzione della milestone** — le fasi 50/51 smontano le
iscrizioni — ma succede **qui**, un paio di fasi prima di dove il piano di
milestone lo colloca, e su una pagina pubblica. Vale la pena saperlo prima del
primo listing: da oggi, da una serata, **non si arriva piu' a un modulo di
registrazione**.

### 2. La ricarica dopo il pagamento non serve piu' a chi non ha una sessione

`onPaymentComplete` ricarica la pagina della serata. Per un ospite quella
ricarica non mostra niente di nuovo: senza sessione l'elenco dei biglietti e'
vuoto per costruzione. **Il ramo non e' stato toccato** — con
`successOutcome` valorizzato il pannello non si chiude da solo e offre
l'indirizzo, che e' il percorso che conta — ma chi preme *«Stay on this page»*
ottiene una ricarica che, per lui, non dice nulla. Rumore, non un guasto.

### 3. Il numero dei rifiuti visibili su questa superficie e' cresciuto senza che nessuno lo conti

`TierSelection` mostra adesso, nello stesso `role="alert"`, le venti cause del
percorso ospite **piu'** i messaggi sollevati dalla strada con sessione **piu'**
la frase locale del pass di evento. Nessuna si collassa con un'altra, ed e' il
comportamento voluto — ma **non esiste nessun controllo che verifichi che restino
distinte**, come invece esiste dentro `order-quote.ts` (il `Record` totale
sull'unione, dove una causa senza frase e' un errore di build). Qui la garanzia
e' solo che le frasi arrivano intatte dal server. Dichiarato, non risolto.

---

## Self-Check

File — verificati esistenti sul disco:

- `src/app/(public)/events/[slug]/page.tsx` — FOUND
- `src/app/(public)/events/[slug]/TierSelection.tsx` — FOUND
- `src/components/events/EventForm.tsx` — FOUND
- `src/app/(admin)/admin/events/actions.ts` — FOUND
- `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` — FOUND
- `.planning/phases/49-comprare-senza-account/deferred-items.md` — FOUND
- `.planning/phases/49-comprare-senza-account/49-08-SUMMARY.md` — FOUND

Commit — verificati in `git log`:

- `06fc7ca` — `fix(49-08): la pagina della serata smette di credere che un biglietto sia uno solo` — FOUND
- `24ae6fa` — `feat(49-08): senza account si sceglie quanti biglietti, si scrive un indirizzo e si paga` — FOUND
- `06e6c4d` — `feat(49-08): il tetto per serata passa in mano a chi organizza` — FOUND

Cancellazioni — `git diff --diff-filter=D` su ciascuno dei tre commit: **vuoto**.

`STATE.md` **non e' stato toccato**, deliberatamente: l'orchestratore lo aggiorna
a fine fase, in un colpo solo.

## Self-Check: PASSED
