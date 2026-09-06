---
phase: 49-comprare-senza-account
plan: 04
subsystem: ticketing
tags: [checkout, ospite, server-action, service-role, rifiuti-come-valore, prezzo-dal-database]

requires:
  - phase: 49-01
    provides: "public.ticket_orders (sumup_checkout_id UNIQUE NOT NULL, user_id nullabile), event_parties.max_tickets_per_order, reserve_ticket_order"
  - phase: 49-03
    provides: "l'arm 5 di venue_for_parties guarda un biglietto — e' la ragione per cui un checkout su una serata in bozza non e' innocuo"
  - phase: 46
    provides: "src/lib/failure/money-path.ts — la costruzione dei rifiuti e la regola che non viaggiano come throw"
  - phase: 9-drinks
    provides: "purchaseDrinksGuest — il checkout da ospite gia' in produzione, di cui questo riusa la forma"
provides:
  - "src/lib/tickets/order-quote.ts — buildOrderQuote: prezzo, tetto, capienza, catena, sconto e minimo, tutti riletti dal database"
  - "purchaseTicketsGuest — un checkout SumUp e una riga ticket_orders pending da una mail e una quantita', senza sessione e senza account"
  - "Venti cause di rifiuto distinte, tutte come VALORE di ritorno"
affects: [49-06, 49-08, 49-11]

tech-stack:
  added: []
  patterns:
    - "Modulo server-only invece di un'esportazione di un file di Server Action, quando la funzione risponderebbe a una domanda che non deve diventare un endpoint"
    - "Rifiuti come valore con Record totale sull'unione: una causa senza la sua frase e' un errore di build"
    - "Il *non si e' potuto rispondere* non si fonde col *no* — e nemmeno il *no* con lui: un id malformato e' «non trovato», non «riprova»"
    - "Un percorso nuovo non puo' essere piu' permissivo di quello che affianca sullo stesso oggetto"

key-files:
  created:
    - src/lib/tickets/order-quote.ts
    - src/app/(public)/events/[slug]/guest-purchase-actions.ts
  modified:
    - .planning/STATE.md

key-decisions:
  - "Il preventivo e' un modulo server-only e non un'esportazione di un file di Server Action: quel tipo di file pubblica ogni esportazione come endpoint"
  - "I rifiuti viaggiano come valore e mai come throw — Next redige il messaggio di un errore sollevato da una Server Action in produzione"
  - "Cancello sulla pubblicazione dell'evento, che il piano non chiedeva: senza, chi indovina l'uuid di una serata in bozza apre un checkout"
  - "Catena dei tier e finestra temporale controllate anche sul percorso ospite: reserve_ticket_order non le guarda"
  - "Il minimo SumUp si applica al TOTALE e non all'unita', perche' e' il totale che va al checkout"
  - "Lo sconto conta quantity usi e non uno: e' cosi' che la RPC li conta, e dire di si' qui a un ordine che la RPC rifiutera' significa rifiutarlo dopo l'incasso"

requirements-completed: []

duration: ~20min
completed: 2026-09-06
---

# Fase 49 Piano 04: l'acquisto senza account — Summary

**Da oggi una persona senza account puo' aprire un checkout per uno o piu'
biglietti dando solo un indirizzo mail, con il prezzo ricalcolato dal database e
nessun account che nasce prima dell'incasso — e il percorso nuovo non e' piu'
permissivo di quello con sessione, che era il modo silenzioso in cui poteva
esserlo.**

## Performance

- **Duration:** ~20 min (primo commit 17:07:01, ultimo 17:13:10)
- **Tasks:** 2 / 2
- **Commit:** 4 (due dei quali sono correzioni dichiarate, non lavoro nuovo)
- **Righe scritte in produzione:** **0**. Nessuna migration, nessun `INSERT`,
  nessuna sessione coniata. Le uniche interrogazioni al database di produzione
  sono state **letture del catalogo** (`information_schema`, `pg_constraint`,
  conteggi), esplicitamente permesse.
- **File nuovi:** 2 — 587 + 329 righe

## Cosa e' stato costruito

### `src/lib/tickets/order-quote.ts` — il preventivo

`buildOrderQuote(client, { partyId, tierId, quantity, discountCodeId })`
(`:278`), marcato `import "server-only"` a `:1`.

**E' un modulo e non un'esportazione di un file di Server Action, di proposito.**
Un file con quella direttiva pubblica **ogni** esportazione come endpoint
raggiungibile dal browser, e una funzione che dato un id di serata e uno di tier
risponde *quanto costa* e *quanti posti restano* sarebbe un oracolo
sull'inventario interrogabile senza costo — in un repository che **non ha rate
limiting**. E' la stessa scelta, con la stessa ragione scritta, di
`src/lib/auth/password-set-link.ts:44-49`.

Otto passi, ciascuno con il proprio rifiuto:

| # | Passo | Letto da | Rifiuto |
|---|---|---|---|
| 1 | quantita' intera `>= 1` | — | `quote_quantity_invalid` |
| 1-bis | forma uuid dei tre identificativi (`:97`) | — | `..._not_found` / `..._unknown` |
| 2 | la serata (`:309`) | `event_parties` | `quote_night_not_found` |
| 3 | l'evento e la sua pubblicazione (`:333`) | `events` | `quote_night_not_on_sale` |
| 4 | il tetto **per ordine** | `max_tickets_per_order` | `quote_quantity_over_cap` |
| 5 | il tier e il suo prezzo (`:359`) | `ticket_tiers` | `quote_tier_not_found`, `quote_tier_other_night` |
| 6 | catena dei tier e capienza (`:389`, `:404`) | `ticket_tiers`, `tickets` | `quote_tier_not_on_sale`, `quote_tier_sold_out`, `quote_tier_not_enough_seats` |
| 7 | lo sconto (`:485`, `:499`, `:522`) | `discount_codes`, `discount_code_tiers`, `tickets` | quattro cause distinte |
| 8 | totale e minimo (`:560`) | — | `quote_below_minimum` |

**Nessuna `select` di questo file nomina una colonna che porti un luogo**, e il
token non compare nemmeno nei commenti — le citazioni al modulo del segreto sono
indirette per quella ragione, non per distrazione. E' il gate *default chiuso*
nella sua unica forma controllabile con un `grep`: **una colonna che non si legge
non si puo' stampare**.

**L'unica uscita che resta non e' una colonna:** `description` (`:579`), composta
qui dal titolo della serata e dal nome del tier, finisce sulla pagina di
riepilogo del fornitore di pagamento. Nessun predicato la vede. E' lo stesso
vincolo che il pass Wallet porta gia' — *un posto scritto in un titolo finisce su
una superficie che non si ritira* — cioe' **un vincolo su come si da' un nome a
una serata**, non un difetto riparabile qui. Composta in **un solo posto** perche'
quel vincolo abbia un solo indirizzo.

### `src/app/(public)/events/[slug]/guest-purchase-actions.ts` — l'azione

`purchaseTicketsGuest` (`:187`), unica esportazione del file.

1. indirizzo `trim()` + minuscolo, tetto di 254 caratteri e forma esplicita
   (`:109`, `:119`) — nessuna libreria di validazione, decisione gia' registrata
   in `checkin/route.ts:110-116`;
2. `getServiceClient()`, con la giustificazione scritta nel docblock **e** nel
   messaggio di commit;
3. `buildOrderQuote(...)`, che rifiuta o restituisce il preventivo;
4. `crypto.randomUUID()` (`:245`) usato **sia** come `ticket_orders.id` **sia**
   come `checkout_reference`;
5. `createCheckout` (`:272`) con `returnUrl` al webhook e `redirectUrl` verso
   `/payment/callback` con `order`, `ctx=ticket_order` (`:257`) e `slug`;
6. `insert` su `ticket_orders` (`:300`) con **`user_id: null`** (`:305`).

## Verifica — evidenza, non aggettivi

> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test` e non esiste alcun `*.test.*` o `*.spec.*`. **Niente qui e' verificato
> perche' «i test passano».** La verifica automatica e' `npm run build` (che e'
> anche il typecheck di Next); il resto e' lettura del catalogo e procedura
> scritta.

| Controllo | Comando | Esito |
|---|---|---|
| Build + typecheck | `npm run build` | **exit 0** (rieseguito dopo ogni commit; l'ultima volta sull'albero come e' committato) |
| Superfici del venue | `npm run verify:venue-surfaces` | **exit 0 — PASSED** |
| `import "server-only"` nel preventivo | `grep -c` | **1** |
| Direttiva di Server Action nel preventivo | `grep -c '"use server"'` | **0** |
| Colonne di luogo nel preventivo | `grep -c 'venue_text\|venue_secret\|venue_id\|google_maps_url\|address'` | **0** |
| La parola stessa nel preventivo | `grep -c venue` | **0** |
| `max_tickets_per_order` nel preventivo | `grep -c` | **3** |
| Frasi di rifiuto distinte nel preventivo | costanti / frasi / rami dell'unione | **16 / 16 / 16** |
| Risoluzione di sessione nell'azione | `grep -c 'auth.getUser'` | **0** |
| Creazione di conti nell'azione | `grep -c 'createUser\|admin.createUser'` | **0** |
| `ctx=ticket_order` nell'azione | `grep -c` | **2** |
| Colonne di luogo nell'azione | `grep -c 'venue_text\|venue_secret\|google_maps_url'` | **0** |
| Esportazioni dell'azione | `grep -c '^export '` | **1** — `purchaseTicketsGuest` |

### Le colonne, confrontate col catalogo invece che ricordate

**Nessun client Supabase di questo repository e' parametrizzato con `Database`**
(`src/lib/supabase/service.ts:4` e i tre fratelli): un nome di colonna sbagliato
in una `.select()` **compila**, gira e restituisce `undefined`, su una superficie,
senza niente nei log, in un progetto che non ha error tracking. In questo repo il
typecheck non copre le query — quindi le **25 colonne** lette o scritte da questo
cammino sono state confrontate una per una con `information_schema.columns` in
produzione, in sola lettura, il 2026-09-06:

- `ticket_orders` — le 13 colonne dell'`insert` esistono tutte, con
  `party_id`/`user_id`/`discount_code_id` nullabili e `buyer_email`,
  `sumup_checkout_id`, `total_amount`, `quantity`, `status` `NOT NULL`;
- i due `CHECK` della tabella letti da `pg_constraint`:
  `status = ANY (ARRAY['pending','completed','failed','expired'])` e
  `quantity > 0`. Il valore che l'azione scrive e' `pending`, e la quantita' e'
  garantita `>= 1` dal preventivo prima di arrivarci;
- esistono `event_parties.{id,event_id,title,max_tickets_per_order}`,
  `events.{id,slug,is_published}`,
  `ticket_tiers.{id,name,price,event_id,party_id,quantity,starts_at,expires_at}`,
  `discount_codes.{id,party_id,discount_type,discount_amount,max_uses,is_active}`,
  `discount_code_tiers.{discount_code_id,tier_id}`,
  `tickets.{tier_id,discount_code_id}`.

### Lo stato della produzione, misurato oggi in sola lettura

| Cosa | Righe |
|---|---|
| `ticket_orders` | **0** |
| `tickets` | **0** |
| `ticket_tiers` | **1** — con serata, **senza capienza**, **senza finestra temporale** |
| `discount_codes` | **0** |
| `event_parties` | 3, **tutte** con `max_tickets_per_order = 6` |
| `events` | 2, **entrambi pubblicati** |

**Va letto per quello che dice sulla verifica, non solo sul prodotto:** con un
tier senza capienza e senza finestra e zero codici sconto, oggi in produzione i
passi 6 e 7 **non possono rifiutare nulla**. Sono scritti per il momento in cui
esisteranno un secondo tier e un tetto, e finche' quel momento non arriva
**restano non esercitati**.

## Cosa NON e' stato verificato, e perche'

**Nessuna prova comportamentale esiste.** Non e' stato aperto nessun checkout,
non e' stata scritta nessuna riga d'ordine e nessuna sessione e' stata coniata:
farlo sarebbe **una scrittura in produzione**, fuori dall'autorizzazione, che per
questo piano e' **codice soltanto**. Quindi:

- **non e' provato** che un checkout nasca davvero e che il fornitore accetti la
  descrizione composta;
- **non e' provato** che l'`insert` passi i due `CHECK` — e' provato che i valori
  che il codice scrive **stanno dentro** i vincoli letti dal catalogo, che e' una
  cosa piu' debole e va chiamata col suo nome;
- **non e' provato** che il rifiuto arrivi al browser come frase leggibile:
  questa e' la proprieta' che il gate *zero fallimenti silenziosi* protegge, e la
  sua prova sta su una pagina reale, quindi nel piano 49-08 e nel 49-11.

### Le procedure da eseguire, scritte perche' sono l'unica prova che esistera'

> **P-BUY-1 — l'ordine nasce.** Su una serata pubblicata, **senza sessione**,
> chiamare l'azione con un indirizzo valido e quantita' 2. **Attendere:**
> `success: true`, e in `ticket_orders` **una** riga con `status = 'pending'`,
> `user_id` **nullo**, `buyer_email` in minuscolo, `quantity = 2`,
> `total_amount` uguale a due volte il prezzo del tier letto dal database, e
> `sumup_checkout_id` uguale all'id restituito. `id` e `checkout_reference` del
> checkout devono essere **lo stesso uuid**.
>
> **P-BUY-2 — il tetto.** Stessa chiamata con `quantity = 7` su una serata a 6.
> **Attendere:** `success: false`, `refusal: "quote_quantity_over_cap"`, una
> frase che nomina **6** e dice *per ordine*, e **zero** righe nuove in
> `ticket_orders`. Una riga qualsiasi e' il fallimento.
>
> **P-BUY-3 — il prezzo non arriva dal client.** Impossibile da falsificare
> dall'esterno per costruzione — l'azione non accetta un prezzo — quindi la
> prova e' l'ispezione della firma piu' la verifica che `total_amount` della
> riga coincida con il prezzo del catalogo, **non** con qualcosa mandato dal
> browser.
>
> **P-BUY-4 — nessun account nasce.** Contare `auth.users` e `profiles` prima e
> dopo una chiamata riuscita **non seguita da pagamento**. **Attendere:
> identici.** Un conto in piu' e' il difetto degli account fantasma che questa
> fase esiste per non introdurre.
>
> **P-BUY-5 — la serata in bozza.** Con un evento **non pubblicato**, chiamare
> l'azione su una sua serata. **Attendere:** `refusal:
> "quote_night_not_on_sale"` e zero righe. E' il cancello aggiunto qui fuori dal
> piano: se cade, chi indovina un uuid apre un checkout su una serata che non e'
> in vendita.
>
> **P-BUY-6 — il rifiuto arriva leggibile in PRODUZIONE.** Su un build di
> produzione, non in `next dev`: provocare due rifiuti diversi (quantita' oltre
> il tetto, e indirizzo malformato) e verificare che il browser mostri **due
> frasi diverse**. Se mostrasse la stessa frase generica, il valore di ritorno
> non sta arrivando e siamo tornati al difetto del `throw` redatto.

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] Il cancello sulla pubblicazione dell'evento

- **Trovato durante:** task 1.
- **Il buco:** il piano non chiedeva nessun controllo sulla pubblicazione. Senza,
  chiunque conosca o indovini l'uuid di una serata in **bozza** puo' aprire un
  checkout su di essa. Il percorso con sessione non ha il controllo esplicito
  perche' non ne ha bisogno: chi compra li' passa da una pagina che esiste solo
  per un evento pubblicato. **Una server action pubblica non ha quella pagina
  davanti.**
- **Perche' pesa piu' di ieri:** dal piano 49-03 un biglietto e' anche cio' che
  apre l'indirizzo di quella serata. Gli arm di `venue_for_parties` stanno tutti
  sotto `is_published`, quindi l'indirizzo non uscirebbe **subito** — ma la
  chiave si consegnerebbe prima, e si aprirebbe da sola nel momento della
  pubblicazione.
- **Fix:** lettura di `events.is_published` e rifiuto `quote_night_not_on_sale`
  (`order-quote.ts:333-343`).
- **Commit:** `77cc5d0`.

### 2. [Rule 2 — funzionalita' critica mancante] La catena dei tier e la finestra temporale

- **Trovato durante:** task 1, confrontando i due percorsi invece di guardare
  solo quello nuovo.
- **Il buco:** il piano chiedeva la sola capienza. Ma **`reserve_ticket_order`
  non guarda ne' la finestra temporale ne' l'ordine dei tier** (piano 49-01: *«tier
  `FOR UPDATE` con venduti + quantity > capienza»*), e il percorso con sessione
  **le applica lato server** (`admin/events/actions.ts:1339-1427`). Un percorso
  ospite senza questo blocco sarebbe stato **piu' permissivo** di quello con
  sessione sullo stesso tier: chiamando l'azione direttamente si comprava
  l'early bird mentre la pagina lo mostra chiuso. Su un prodotto dove i tier
  sono il meccanismo del prezzo, non e' un dettaglio di UI.
- **Fix:** lo stesso algoritmo del percorso con sessione, con la stessa direzione
  permissiva su lettura fallita (`order-quote.ts:373-474`).
- **Commit:** `77cc5d0`.

### 3. [Conflitto di gate] Il rifiuto viaggia come valore, non come `throw`

- **Il conflitto:** il piano, al passo 7 del task 2, chiede di *«sollevare un
  errore che l'utente vede»*. `money-path.ts:62-69` dice l'opposto e con la
  misura davanti: **Next redige** il messaggio di un errore sollevato da una
  Server Action in un build di produzione, quindi frasi diverse arrivano
  identiche proprio dove contano.
- **Risolto:** vince il gate. Tutti i rifiuti — venti fra preventivo e azione —
  sono valori di ritorno, sulla forma di `updateMenuClosesAt`
  (`menu/actions.ts:143-190`). Il piano 49-08 dice gia' *«il messaggio del server
  si mostra come arriva»*, che con un `throw` sarebbe stato impossibile.
- **Commit:** `b89189c`.

### 4. [Rule 2] Una categoria per il checkout che non si apre

- `createCheckout` **lancia** (`src/lib/sumup.ts:31-38`). Senza un `catch`
  proprio, un rifiuto del fornitore sarebbe arrivato come errore non gestito —
  indistinguibile, per chi guarda, da un `insert` fallito, e i due si riparano in
  posti diversi. Aggiunta `guest_checkout_failed` con la sua riga di log
  (`guest-purchase-actions.ts:288`).
- **Commit:** `b89189c`.

### 5. [Rule 1] Un id malformato veniva raccontato come «riprova fra un momento»

- Un `partyId` non-uuid faceva fallire la query con `22P02`, che cadeva nel ramo
  *non si e' potuto rispondere*. `money-path.ts:71-80` vieta di fondere quel ramo
  col *no*; questo era il caso **opposto e piu' insidioso**, il *no* travestito
  da *non si e' potuto rispondere* — e diceva a chi legge di riprovare una cosa
  che non funzionera' mai. Controllo di forma sui tre identificativi, nessuna
  categoria nuova.
- **Commit:** `7c00a7f`.

### 6. [Rule 1] Il numero dei rifiuti era sbagliato in due commenti

- Due righe dicevano «quattordici» dove il file ne dichiara **sedici** — contate
  dal codice: 16 costanti, 16 frasi, 16 rami dell'unione. Il numero veniva dalla
  prima stesura, prima che due cause entrassero, e non era stato rimisurato.
  E' il difetto che `meta-gates.md` registra su se stesso.
- **Il messaggio del commit `77cc5d0` porta lo stesso errore e resta com'e':** la
  storia non si riscrive, e la correzione e' qui e nel commit `3cb5013`.

### 7. Il piano prescriveva la lettura dello slug nell'azione; sta nel preventivo

`OrderQuote` porta anche `eventSlug`, campo che il piano non elencava. Il
preventivo legge gia' `events` per la pubblicazione, quindi prendere lo slug li'
evita una seconda lettura della stessa riga. Additivo, nessuna colonna in piu'
oltre a `slug`.

## Cio' che il piano non aveva previsto

### 1. Due esecutori sullo stesso albero di lavoro, e un commit misto

Il piano 49-05 e' stato eseguito **in parallelo nello stesso working tree e sullo
stesso indice git**. Il commit `3cb5013` — che doveva contenere solo la
correzione del numero — ha portato con se' anche
`.planning/phases/49-comprare-senza-account/deferred-items.md`, che era **gia'
nell'indice**, messo li' dall'altro esecutore: `git commit` scrive l'indice
intero, non i soli percorsi appena aggiunti.

**Nessun contenuto e' andato perso e nessuna riga e' stata cancellata** (`git
diff --diff-filter=D` su ogni commit: vuoto). Cio' che e' sbagliato e'
l'attribuzione: due voci differite del piano 49-05 vivono sotto un messaggio che
parla d'altro. **Non e' stato «riparato» disfando nulla**, perche' l'altro
esecutore stava lavorando e un `reset` avrebbe potuto distruggere lavoro vivo.

**Regola operativa che ne esce**, e vale per la prossima onda parallela: con due
esecutori su un albero solo si committa nominando i percorsi (`git commit -- <path>`),
mai affidandosi a `git add` seguito da un `git commit` nudo.

### 2. `ctx=ticket_order` oggi non ha un lettore, ed e' voluto

`payment/callback/page.tsx:48` tipizza `ctx` come `"drink" | "ticket"` e
`actions.ts:36-43` ha due soli rami. Con `ticket_order` la pagina cade nel
proprio **stato d'errore progettato** — visibile, non silenzioso — mentre il
webhook emette comunque i biglietti. Il ramo che riconosce il valore lo aggiunge
il piano **49-06**, che dipende da questo. Il valore e' quello giusto **adesso**:
`ctx=ticket` avrebbe mandato l'ordine a cercarsi in `pending_purchases`, cioe'
nella tabella sbagliata, che e' un errore silenzioso invece di uno visibile.

### 3. Il minimo del fornitore non si applica dove lo applica il percorso con sessione

`admin/events/actions.ts:1542` controlla il **prezzo unitario** contro €1,00;
qui il controllo e' sul **totale** (`order-quote.ts:560`), perche' e' il totale
che va al checkout. Non sono due regole: e' la stessa su una quantita' fissa a
uno. Conseguenza: sei biglietti da 0,90 sono un ordine valido da 5,40, dove sul
percorso con sessione un biglietto da 0,90 non lo sarebbe.

### 4. Lo sconto consuma `quantity` usi, non uno

`reserve_ticket_order` conta `quantity` usi del codice (piano 49-01). Un
preventivo che ne contasse uno direbbe di si' a un ordine che il database
rifiutera' **dopo l'incasso**. Il controllo qui e' `(count ?? 0) + quantity >
max_uses` (`order-quote.ts:539`), non `>=`. Il percorso con sessione usa `>=` con
quantita' uno: coincide.

## Registro STRIDE — cosa ne e' stato

| ID | Disposizione | Esito |
|---|---|---|
| `T-49-13` — prezzo manipolato dal client | mitigate | **mitigato**: l'azione non accetta un prezzo; prezzo, sconto e capienza sono riletti dal database e il totale e' sommato sul server (`order-quote.ts:359-560`) |
| `T-49-14` — input non fidato verso il client di servizio | mitigate | **mitigato e dichiarato**: normalizzazione dell'indirizzo, forma uuid sui tre identificativi, nessuna query costruita per concatenazione, giustificazione in quattro punti nel docblock **e** nel messaggio di commit `b89189c` |
| `T-49-15` — l'azione come oracolo su serate e tier | accept | **accettato e scritto**, come la disposizione prevede: il repo non ha rate limiting, e il docblock lo dichiara invece di far credere che qualcuno stia limitando |
| `T-49-16` — un luogo nella `description` del checkout | mitigate | **mitigato per costruzione**: zero colonne di luogo lette dal preventivo, descrizione composta in un solo posto. **Il residuo e' il TITOLO della serata**, testo libero che nessun predicato vede — dichiarato, non risolto |
| `T-49-17` — account fantasma da ogni carrello abbandonato | mitigate | **mitigato**: `user_id: null` (`guest-purchase-actions.ts:305`), nessuna creazione di conti in questo file (`grep` = 0). L'identita' nasce al webhook |

**Nessuna superficie di minaccia nuova oltre a quelle registrate.** Il cammino
non aggiunge tabelle, policy, colonne o rotte: aggiunge **una** server action
pubblica, che e' esattamente `T-49-15`.

## Il debito che resta, dichiarato

- **Nessuna prova comportamentale**: le sei procedure `P-BUY-*` sopra sono
  scritte e **non eseguite**. Su nessuna si arrotonda.
- **Il residuo D-46-07 e' ereditato**: capienza e tetto qui sono consultivi, la
  barriera e' la RPC, e fra il preventivo e la RPC c'e' un pagamento. Denaro
  incassato per un posto che non c'e' resta possibile — **non peggiorato da
  questo piano, e nemmeno migliorato**.
- **Chi paga e digita male l'indirizzo non riceve niente.** La forma si controlla,
  l'esistenza no: nessuna espressione regolare puo'. Con il biglietto al
  portatore e senza account, quella mail e' l'unica strada verso il biglietto —
  e' materia del piano 49-06 (il ritrovamento) e va guardata li'.
- **`AT_THE_DOOR` / superficie dei venduti**: non toccata da questo piano.

## Self-Check

File — verificati esistenti sul disco:

- `src/lib/tickets/order-quote.ts` — FOUND (587 righe)
- `src/app/(public)/events/[slug]/guest-purchase-actions.ts` — FOUND (329 righe)
- `.planning/phases/49-comprare-senza-account/49-04-SUMMARY.md` — FOUND

Commit — verificati in `git log`:

- `77cc5d0` — `feat(49-04): il preventivo di un ordine, calcolato dove non si puo' mentire` — FOUND
- `7c00a7f` — `fix(49-04): un id malformato e' un «no», non un «riprova fra un momento»` — FOUND
- `b89189c` — `feat(49-04): l'acquisto senza account — una mail, una quantita', un checkout` — FOUND
- `3cb5013` — `docs(49-04): il numero dei rifiuti era sbagliato in due commenti — sono sedici` — FOUND

Produzione: **nessuna scrittura**, come l'autorizzazione di questo piano
richiede. Le colonne e i vincoli citati sono letti da `information_schema` e
`pg_constraint` il 2026-09-06.

## Self-Check: PASSED
