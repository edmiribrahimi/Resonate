---
phase: 50-via-le-iscrizioni
plan: 04
subsystem: ticketing
tags: [server-action, ordine-a-totale-zero, identita-leggera, rifiuti-nominati, service-role, rsvp]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 03
    provides: "`sumup_checkout_id` nullabile con indice unico parziale, `buyer_name` sull'ordine, il livello a prezzo zero per le serate gia' esistenti — sul LABORATORIO"
provides:
  - "`reserveFreeTickets`: la sequenza sincrona identita' → riga d'ordine → conio → mail, senza passare dal fornitore di pagamento, con undici cause di rifiuto nessuna delle quali collassa in un'altra"
  - "`Full name` su entrambi i moduli d'ordine: va all'account alla sola creazione, mai su un account che esiste gia', mai sul biglietto"
  - "il livello a prezzo zero nasce e si aggiorna con la SCRITTURA DELLA SERATA: nessun percorso pubblico puo' crearlo"
  - "tre percorsi del pagato non chiedono piu' al fornitore lo stato di un checkout nullo"
  - "`buildOrderQuote` distingue un ordine che va al checkout da uno che non ci va: senza, ogni prenotazione gratuita sarebbe stata rifiutata per non aver raggiunto il minimo di una carta"
affects: [50-05, 50-08, 50-11]

tech-stack:
  added: []
  patterns:
    - "due moduli che chiedono gli stessi campi tengono le costanti in un modulo terzo: un file di Server Action non puo' esportare una costante, quindi la casa comune non puo' essere nessuno dei due"
    - "un campo che il tipo dichiara obbligatorio arriva comunque assente da una chiamata costruita a mano: su una Server Action la garanzia e' il rifiuto, non la firma"
    - "una nullabilita' nuova su una colonna non si propaga ai chiamanti quando i tipi non sono generati: i punti che la ignorano si cercano a mano, uno per uno"

key-files:
  created:
    - src/app/(public)/events/[slug]/free-order-actions.ts
    - src/lib/tickets/buyer-input.ts
  modified:
    - src/lib/tickets/guest-identity.ts
    - src/app/(public)/events/[slug]/guest-purchase-actions.ts
    - src/app/api/webhooks/sumup/route.ts
    - src/app/(admin)/admin/events/actions.ts
    - src/lib/tickets/order-quote.ts
    - src/lib/tickets/replay-order-delivery.ts
    - src/app/api/cron/retry-failed-orders/route.ts
    - src/app/(public)/payment/callback/actions.ts

key-decisions:
  - "Il preventivo impara UNA distinzione — se l'ordine va al fornitore — invece di essere duplicato per il percorso gratuito: senza, `quote_below_minimum` avrebbe rifiutato ogni prenotazione a totale zero, e con una seconda copia il tetto per ordine e la capienza avrebbero avuto due implementazioni"
  - "Un ordine gratuito che fallisce si marca `failed` come fa il webhook, ma PRIMA e' stato tolto dal rigioco del pagato: senza quel filtro il cron avrebbe chiesto al fornitore, ogni mattina e per sempre, lo stato di un checkout inesistente"
  - "`fullName` e' facoltativo NEL TIPO sul modulo a pagamento e obbligatorio nel comportamento: la superficie che lo compila la converte il piano 50-05, e un tipo che rompe il build nel frattempo sarebbe un errore di compilazione, non una difesa"
  - "Il fallimento del livello di prenotazione ha una categoria propria e non `write_failed`: le altre dicono «la serata non e' stata scritta», questa dice l'opposto"

patterns-established:
  - "Tre controlli indipendenti prima di emettere un biglietto gratuito — serata `free_rsvp`, livello a prezzo zero, preventivo a zero — e nessuno dei tre dedotto dagli altri"
  - "Un successo senza biglietti non si restituisce: la riserva che torna con l'insieme vuoto e senza errore e' un rifiuto, perche' un fallimento con la faccia di un si' e' la sua forma peggiore"

requirements-completed: [REG-06]

duration: 55min
completed: 2026-09-21
---

# Phase 50 Plan 04: L'ordine a totale zero Summary

**Esiste un'azione che, su una serata gratuita, produce un ordine a totale zero, N biglietti veri, un account leggero con il nome di chi prenota e la stessa mail con QR del percorso pagato — e che sulla stessa chiamata, su una serata a pagamento, rifiuta dicendo quale dei tre controlli l'ha fermata. Il nome arriva all'account su entrambi i percorsi, non sovrascrive mai un nome gia' scritto, e non compare in nessun punto del biglietto.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-21T13:00Z (circa)
- **Completed:** 2026-09-21T13:56Z
- **Tasks:** 3 su 3
- **Files:** 2 creati, 8 modificati

## Task Commits

| # | Commit | Cosa |
|---|---|---|
| Task 1 | `2d17c5f` | il nome all'account su entrambi i percorsi |
| deviazione | `b9d4f7a` | i tre percorsi del pagato che chiedevano un checkout nullo |
| Task 2 | `228d50f` | l'ordine a totale zero, e la distinzione nel preventivo |
| Task 3 | `a65d7b8` | il livello di prenotazione nasce con la serata |
| igiene | `f32a499` | una direttiva eslint che non disattivava niente |

---

## Task 1 — il nome nell'account, su entrambi i percorsi

### Dove il nome si scrive, e dove no

`src/lib/tickets/guest-identity.ts:220` — terzo parametro `fullName?: string | null`,
facoltativo e in coda, cosi' che i chiamanti esistenti restino validi.
`:277` lo normalizza e lo tronca al tetto dichiarato; `:283` lo mette nei
metadati **solo se dopo la normalizzazione resta qualcosa**, e **solo sul ramo
che conia**:

```ts
...(name ? { user_metadata: { full_name: name } } : {})
```

**Sul ramo del ritrovamento non si scrive niente** — ne' un `update`, ne' «solo
se il campo e' vuoto». La ragione sta accanto alla chiamata: questa funzione e'
raggiunta da un percorso **pubblico e senza sessione**, quindi un ramo che tocca
l'anagrafica di un conto esistente sarebbe la primitiva *chiunque conosca un
indirizzo puo' riscrivere il nome di quell'account*. Verificata da un grep che
resta a **0**: nessun `.update` su `profiles` in quel file.

### Le due cause del nome sul modulo a pagamento

`guest-purchase-actions.ts:162-163` — `guest_name_missing` e
`guest_name_too_long`, con la loro frase nel `Record` totale. Sono due perche'
chiedono due gesti diversi: *scrivi il tuo nome* e *accorcialo*. Il nome
normalizzato entra nell'ordine a `:386` (`buyer_name`) e **non** nella
descrizione del checkout, che si compone in un posto solo dentro il preventivo.

### Il webhook

`src/app/api/webhooks/sumup/route.ts:365` — `buyer_name` nella `select`;
`:459` — terzo argomento a `resolveGuestIdentity`. **Nient'altro e' cambiato in
quel file**: non l'ordine dei passi, non la verifica dell'incasso via GET, non i
rami idempotenti, non `p_issued_via: "guest_checkout"`. Il `git diff` del commit
`2d17c5f` su quel file e' di 12 righe, tutte fra la `select` e quella chiamata.

### Il commento che era diventato falso

`guest-purchase-actions.ts` portava una sezione intitolata **«Nessun nome viene
chiesto»** con la sua argomentazione. `D-50-18b` la smentisce a meta': il nome si
chiede, ma la ragione che reggeva quella sezione — *un nome sullo schermo dello
staff fa rifiutare un ospite valido* — **non e' stata smentita affatto**. La
sezione e' stata **riscritta dichiarando il rovesciamento**, non cancellata: una
regola tolta senza la sua ragione torna folklore, e qualcuno la «ripara».

### Gli otto grep del task, misurati

| Grep | Atteso | Misurato |
|---|---|---|
| `full_name` in `guest-identity.ts` | ≥ 2 | **2** |
| `user_metadata` in `guest-identity.ts` | 1 | **1** |
| `.from("profiles")…update` in `guest-identity.ts` | 0 | **0** |
| `buyer_name` in `guest-purchase-actions.ts` | ≥ 1 | **3** |
| `guest_name_missing|guest_name_too_long` | ≥ 4 | **4** |
| `buyer_name` nel webhook | ≥ 2 | **3** |
| `holder_label` in `guest-purchase-actions.ts` | 0 | **0** |
| `LIMIT 1\|limit(1)` in `guest-identity.ts` | non aumentato | **0 prima, 0 dopo** |

---

## Task 2 — l'ordine a totale zero

`src/app/(public)/events/[slug]/free-order-actions.ts:209` —
`reserveFreeTickets({ partyId, quantity, email, fullName })`, **unica
esportazione del file**.

### I nove passi, e dove sono

| # | Passo | Riga | Rifiuto |
|---|---|---|---|
| 1 | mail e nome, con le costanti del modulo gemello | `:228-247` | `free_email_missing`, `free_email_malformed`, `free_name_missing`, `free_name_too_long` |
| 2 | la serata riletta **dal database** | `:275` | `free_not_free_rsvp` (piu' `free_unreadable` se la lettura non risponde) |
| 3 | il livello a prezzo zero, **mai creato da qui** | `:292-325` | `free_tier_missing` |
| 4 | il preventivo, lo stesso del pagato | `:336-357` | le sue cause, intatte |
| 5 | la riga d'ordine | `:361-400` | `free_order_not_saved` |
| 6 | l'identita' | `:437` | `free_identity_failed` |
| 7 | il portatore allacciato | `:451-458` | `free_buyer_not_attached` |
| 8 | la riserva | `:467-475` | `free_mint_failed` |
| 9 | la mail, dentro un `try` | `:501-515` | nessuno: **i biglietti esistono gia'** |

### Le tre righe che decidono

- **`:391` `status: "pending"`** — e non lo stato chiuso, con la ragione
  misurata accanto: un ordine che nascesse gia' chiuso cadrebbe nel ramo
  idempotente della RPC (`20260905120100:77-84`), che esce restituendo l'insieme
  vuoto **senza errore**. Zero biglietti, nessun avviso, e una riga che dice di
  essere a posto. E' la lettera di `D-50-19` a essere sbagliata, non la sua
  intenzione.
- **`:381` `sumup_checkout_id: null`** — nullo e non sintetico: un valore finto
  supererebbe il `continue` di `reconcile-refunds/route.ts:105` e manderebbe una
  richiesta al fornitore ogni giorno, per ogni biglietto gratuito mai emesso.
- **`:469` `p_issued_via: "free_rsvp"`** — un valore nuovo su una colonna di
  testo nudo: nessun `CHECK` allargato.

### T-50-16 — tre controlli indipendenti, e nessuno dedotto dagli altri

1. `:275` — `party.access_type !== "free_rsvp"` letto **dal database**, non dalla
   superficie: e' cio' che impedisce a questo percorso di coniare biglietti su
   una serata **a pagamento**;
2. `:314` — il livello letto ha davvero `price = 0`, controllo di sanita' su un
   dato che decide se qualcuno paga;
3. `:351` — il preventivo da' `totalAmount === 0`, altrimenti si rifiuta invece
   di procedere.

### Undici cause, non nove

Il piano ne elencava nove. Ne sono state scritte **undici**, e le due in piu'
non sono ornamento:

- **`free_unreadable`** — il terzo membro obbligatorio di ogni unione costruita
  su una lettura (`money-path.ts` §4): *la domanda non ha avuto risposta* non si
  fonde mai con *no*. Senza, una lettura caduta sarebbe stata raccontata come
  «questa serata non prende prenotazioni», che e' un'altra cosa.
- **`free_buyer_not_attached`** — il passo 7 del piano chiede *«il suo rifiuto
  proprio»*: senza, il fallimento sarebbe arrivato un passo piu' in la' con il
  nome di un'altra causa addosso.

### Il successo che non si restituisce

`:480` — se la riserva torna **senza errore e con zero biglietti**, l'azione
**rifiuta**. Su un ordine nato `pending` un istante prima quello stato non e'
spiegabile, ed e' precisamente cio' che §0/C7 descrive. Un successo senza
biglietti e' la forma peggiore del fallimento silenzioso, perche' ha la faccia
di un si'.

### Il residuo dichiarato: nessun limitatore di frequenza

**Questo repository non ha rate limiting** — nessuna dipendenza, nessuna
implementazione. Sul percorso pagato il freno e' la carta: chi vuole mille
biglietti paga mille biglietti. **Qui quel freno non c'e'**, e l'unica difesa e'
il **tetto per ordine** (`event_parties.max_tickets_per_order`, 6 per default,
`D-50-26`) piu' la capienza del livello, **entrambi applicati dentro la
transazione della RPC**, che e' l'unico posto dove reggono sotto concorrenza.

Sei posti per chiamata, e **niente che impedisca la chiamata successiva**. E'
T-50-17 con disposizione *mitigate* sul tetto e *accept* sulla frequenza, ed e'
scritto nel docblock del file oltre che qui.

### I grep del task, misurati

| Grep | Atteso | Misurato |
|---|---|---|
| righe `^export ` | 1 | **1** |
| `status: "pending"` | 1 | **1** |
| `completed` fuori dai commenti | 0 | **0 righe in tutto il file** |
| `free_rsvp` | ≥ 2 | **5** |
| le nove cause del piano | ≥ 18 | **18** |
| formula generica al posto della causa | 0 | **0** |
| `insert` su `ticket_tiers` | 0 | **0** |
| `createCheckout\|sumup` | 0 salvo l'insert | **1 riga: `:381`** |
| `redactDbError` | ≥ 1 | **7** |

---

## Task 3 — il livello a zero nasce con la serata

`src/app/(admin)/admin/events/actions.ts:713` — `ensureFreeRsvpTier`, chiamata
in **due** posti: `:1000` (creazione, sulle righe tornate dal bulk insert) e
`:1350` (aggiornamento, dentro il ciclo delle serate, **dopo** la scrittura).

- **Crea** con la stessa forma del riempimento della migration: `name = 'RSVP'`
  (`:673`), `price = 0`, `quantity` dalla capienza — **nulla quando la capienza
  e' nulla**, perche' li' `NULL` significa *non dichiarata* e su un livello
  significa *illimitato*: la stessa cosa detta due volte.
- **Non cancella mai.** Una serata che smette di essere `free_rsvp` tiene il suo
  livello: puo' gia' avere biglietti emessi, `ticket_orders.tier_id` e'
  `ON DELETE RESTRICT`, e quei biglietti devono continuare a passare dalla porta.
  Grep di negazione sul file: **0** `delete` su `ticket_tiers`.
- **Allinea `quantity`** quando la capienza della serata cambia. Senza,
  l'organizer cambierebbe il numero sulla serata e quella vera resterebbe la
  vecchia, **dentro la RPC, dove nessuno la vede**. E' il debito che il SUMMARY
  del 50-03 lasciava a questo piano, chiuso.

`createEvent` ora legge gli id **dal proprio insert** (`:958`, `.select("id,
access_type, capacity, sort_order, title")`) invece di rileggerli: una seconda
lettura potrebbe gia' vedere un'altra verita'.

### Il fallimento ha una categoria propria

`:306` — `kind: "rsvp_tier_failed"`, con la sua frase a `:405`. Non e'
`write_failed` perche' dice **l'opposto**: la serata *e'* scritta, e' la
prenotazione a non essere aperta. Se non lo dicesse, il difetto lo scoprirebbe
un ospite rifiutato con `free_tier_missing`, non chi ha salvato — e questo
progetto non ha error tracking, quindi l'unico effetto osservabile disponibile
e' la frase che l'organizer legge adesso.

In creazione il rifiuto **cancella la bozza**, come gia' fa il ramo gemello e
per la stessa ragione: un no che lascia la riga dietro regala una seconda bozza
a chi riprova.

### `A5` — verificato, e regge

**Un livello a prezzo zero su una serata gratuita NON compare in nessuna
superficie che elenca i livelli a pagamento.** Misurato leggendo il codice:

| Superficie | Riga | Perche' non lo mostra |
|---|---|---|
| pagina pubblica della serata, livelli per serata | `(public)/events/[slug]/page.tsx:605` | la lettura dei livelli e' dentro `if (party.access_type === "paid")` |
| pagina pubblica, livelli di evento | `…/page.tsx:875-876` | filtra `party_id IS NULL`, e questo livello una serata ce l'ha |
| pannello biglietti dell'organizer | `(admin)/admin/(work)/events/[id]/tickets/page.tsx:194` e `:602` | la lettura dei livelli **non** filtra per `access_type`, ma il rendering cicla sulle **serate**, e quelle sono filtrate a `access_type = 'paid'`: il livello di una serata gratuita non ha un gruppo in cui comparire |

La terza riga e' la piu' fragile delle tre — regge per la lista delle serate,
non per la query dei livelli. E' riportata invece che riparata qui, come il
piano chiede.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Il preventivo avrebbe rifiutato OGNI prenotazione gratuita**

- **Found during:** Task 2, leggendo `order-quote.ts` prima di chiamarlo
- **Issue:** Il passo 4 del piano prescrive `buildOrderQuote` *«tetto per
  ordine, capienza, minimo»* e nello stesso capoverso si aspetta un totale di
  `0`. Le due cose non stanno insieme: `order-quote.ts:585` rifiuta con
  `quote_below_minimum` qualunque totale sotto **1,00 €**, che e' il minimo di
  una **carta**. Un ordine gratuito ha totale `0`: l'azione avrebbe rifiutato
  **sempre**, dicendo a chi prenota che non ha raggiunto il minimo di un
  pagamento che nessuno sta facendo.
- **Fix:** `OrderQuoteInput.goesToPaymentProvider` (`:282`), **vero per
  default**, e la riga del minimo diventa
  `input.goesToPaymentProvider !== false && …` (`:585`). Salta **una** riga, e
  quella riga parla di carte: tetto per ordine, catena dei livelli, capienza,
  catalogo e pubblicazione dell'evento restano identici a zero euro. L'alternativa
  — un preventivo gemello per il percorso gratuito — avrebbe dato al tetto e alla
  capienza **due implementazioni**, che e' il modo in cui due strade del denaro
  divergono senza che nessuno se ne accorga.
- **Files modified:** `src/lib/tickets/order-quote.ts:270-283`, `:578-586`
- **Commit:** `228d50f`

**2. [Rule 2 - Missing Critical] Tre percorsi del pagato avrebbero chiesto al fornitore un checkout nullo**

- **Found during:** Task 2, decidendo se un ordine gratuito fallito debba
  portare `status = 'failed'`
- **Issue:** `cron/retry-failed-orders/route.ts:47-52` prende **ogni** ordine
  `failed` e lo passa a `replayPaidOrderDelivery`, che chiama
  `getCheckout(order.sumup_checkout_id)` senza guardia. Dal 50-03 quella colonna
  e' nullabile, **e i tipi di questo repository non sono generati**: la
  nullabilita' non si propaga ai chiamanti e il compilatore non segnala niente —
  il SUMMARY del 50-03 lo scrive in fondo, ed e' la nota che ha fatto trovare
  questo. Marcare `failed` un ordine gratuito senza toccare quel cron avrebbe
  prodotto una domanda al fornitore su un checkout inesistente **ogni mattina,
  per sempre**, con la risposta raccontata come «fornitore irraggiungibile».
- **Fix:** tre guardie, nessuna delle quali cambia comportamento su un ordine
  pagato (li' il campo e' non nullo per costruzione):
  `retry-failed-orders/route.ts:56` filtra i candidati a chi un checkout ce l'ha;
  `replay-order-delivery.ts:82-86` rifiuta con la causa propria `no_checkout`;
  `(public)/payment/callback/actions.ts:188` esce prima della verifica quando non
  c'e' un incasso da verificare.
- **Files modified:** i tre qui sopra
- **Commit:** `b9d4f7a`

**3. [Rule 3 - Blocking] Le costanti dei due moduli non potevano stare nel modulo che le aveva**

- **Found during:** Task 1, applicando *«le stesse costanti del percorso
  pagato»*
- **Issue:** `EMAIL_MAX_LENGTH` ed `EMAIL_SHAPE` vivevano dentro
  `guest-purchase-actions.ts`, che e' un file di Server Action: **da li' non si
  puo' esportare una costante** — quella direttiva ammette solo esportazioni di
  funzioni asincrone, e ognuna diventa un endpoint. Copiarle nel modulo nuovo
  avrebbe creato due verita' che divergono al primo che ne corregge una.
- **Fix:** `src/lib/tickets/buyer-input.ts`, con i tre numeri, le due
  normalizzazioni e **nessuna categoria di rifiuto** (quelle restano di chi le
  legge). Non e' `server-only` di proposito: la superficie che 50-05 costruira'
  deve poter fermare un campo troppo lungo **prima** di chiamare l'azione, con lo
  stesso numero.
- **Files modified:** `src/lib/tickets/buyer-input.ts` (nuovo),
  `guest-purchase-actions.ts:11-17`
- **Commit:** `2d17c5f`

**4. [Rule 1 - Bug] Un commento diventato falso, e uno rotto da una correzione**

- **Found during:** Task 1 e Task 2
- **Issue:** (a) `guest-purchase-actions.ts` dichiarava **«Nessun nome viene
  chiesto»**, che `D-50-18b` smentisce; (b) il docblock del modulo nuovo citava
  la frase generica del form della newsletter **alla lettera**, e quel criterio
  d'accettazione la cerca con un grep che non distingue i commenti — lo stesso
  inciampo che il 50-03 ha registrato sui `COMMENT ON`.
- **Fix:** (a) la sezione riscritta **dichiarando il rovesciamento**, con la
  parte di `D-49-03` che non e' stata smentita ribadita per esteso; (b) il
  precedente della newsletter descritto con le parole del dominio — *«una frase
  generica sola»* — cosi' che il gate misuri cio' che intende misurare invece di
  essere aggirato.
- **Commit:** `2d17c5f`, `228d50f`

**5. [Rule 1 - Bug] Una soppressione eslint che non sopprimeva niente**

- `no-control-regex` non e' attiva in questa configurazione: la direttiva
  produceva un avviso in piu'. Tolta. **Commit:** `f32a499`

### Cio' che il piano prevedeva e che NON e' stato fatto

Niente dei tre task. Due scelte vanno dichiarate perche' **sembrano** omissioni:

- **`fullName` e' facoltativo nel TIPO** su `purchaseTicketsGuest`
  (`:250`) e obbligatorio nel comportamento (`:265-283`). La superficie che lo
  compila — il modulo dei tier — la converte il piano **50-05**, che e' onda 4 e
  legge *«la firma di `purchaseTicketsGuest` dopo il piano 50-04, con
  `fullName`»*. Un campo obbligatorio nel tipo avrebbe rotto il build su un file
  che non e' mio, e non avrebbe aggiunto **nessuna** garanzia: questa funzione e'
  un endpoint, e un campo dichiarato obbligatorio arriva comunque assente da una
  chiamata costruita a mano. **Finche' 50-05 non aggiunge il campo, il percorso
  d'acquisto da ospite rifiuta con `guest_name_missing`** — e' la conseguenza
  dichiarata, ed e' nella stessa fase e prima dello stesso deploy.
- **`P-50-7` non e' stato eseguito**, e la ragione e' che **non e' eseguibile
  oggi**: vedi la sezione qui sotto.

---

## `P-50-7` — la procedura, e perche' non e' stata percorsa

**Nessuna riga di questo SUMMARY dice che il percorso gratuito e' stato
esercitato.** Non lo e' stato, e non per mancanza di tempo: `reserveFreeTickets`
e' una Server Action, e una Server Action **non si chiama da fuori** — la sua
invocazione porta un identificativo che il build conia e che solo un client
generato da Next possiede. Il modulo che la chiama e' `FreeOrderForm.tsx`, ed e'
il piano **50-05**. Fino ad allora l'unica cosa esercitabile sarebbe la sequenza
SQL, che **il piano 50-03 ha gia' esercitato** sul laboratorio (due biglietti,
seconda chiamata a zero biglietti nuovi, capienza che rifiuta con la sua causa).

I passi, perche' chi la percorrera' non debba ricostruirli:

1. `npm run dev:lab`, serata `free_rsvp` del banco (capienza **4**, livello
   `RSVP` a 0), da **anonimo**;
2. nome e mail, quantita' **2** → attendere l'esito dell'azione;
3. leggere dal catalogo: `ticket_orders` con `total_amount = 0`,
   `sumup_checkout_id` **nullo**, `status` chiuso, `buyer_name` valorizzato;
   `tickets` **2** righe con `issued_via = 'free_rsvp'` e `holder_label`
   `1 di 2` / `2 di 2` — **senza nome**; `profiles.full_name` del conto nuovo
   uguale al nome digitato;
4. **la mail**: una sola, con QR e link firmato, e il registro `email_deliveries`
   con la sua riga;
5. ripetere con la **stessa mail**: nasce un **secondo ordine** (due
   prenotazioni sono due ordini, ed e' corretto) e il conto **non** viene coniato
   di nuovo — `resolveGuestIdentity` lo ritrova, e `full_name` **non cambia**
   anche se si digita un nome diverso: e' T-50-18, e questo passo e' l'unico
   posto in cui si vede;
6. quantita' **7** su un tetto di 6 → rifiuto con la causa del tetto;
   quantita' **3** sui 2 posti rimasti → rifiuto con la causa della capienza;
7. la stessa azione su una serata **a pagamento** → `free_not_free_rsvp`;
8. una serata `free_rsvp` **senza** livello a zero → `free_tier_missing`, con la
   frase che dice all'organizer cosa fare.

`P-50-8` (la porta, con la radio spenta) resta come scritto: un biglietto
gratuito e' una riga di `tickets` con la sua firma, e lo scanner non conosce la
differenza — **va verificato, non dedotto**.

---

## La verifica

- **`npm run build` → exit 0**, `✓ Compiled successfully`, dopo **ogni** task.
  E' il typecheck di Next, ed e' l'unico cancello automatico che questo
  repository ha sul prodotto: **non esiste un test runner**, e nessuna riga di
  questo SUMMARY dice che dei test passano.
- **`npx eslint`** sui sette file toccati: **0 errori, 0 avvisi** (dopo `f32a499`).
- **`npm run verify:routes` → PASS**, tre controlli verdi.
- **`npm run verify:conversion` → `CONVERSION_OK`**, sei controlli su 35
  superfici, 205 file.
- **`npm run verify:venue-surfaces` → FAILED, 1 asserzione**, ed e' **la stessa
  di prima di questo piano**:

  ```
  G2  src/app/(public)/payment/callback/actions.ts selects
      {id, status, sumup_checkout_id, ticket_id};
      the authorised set is {id, status, ticket_id}.
  ```

  **Il rosso e' della fase 49 e non di questo piano**, verificato leggendo il
  file alla punta dell'onda 2 (`git show 0841578:…` porta gia'
  `.select("id, status, sumup_checkout_id")` a `:143`). Questo piano ha
  **aggiunto una guardia** su quella colonna, non la colonna. **La lista positiva
  non e' stata allargata**: il gate dice *«Fix the SURFACE, not this gate»*, e
  allentare un'asserzione su un percorso di rivelazione e' l'unica modifica di
  questo repository che non si annulla.
- **`npm run verify:capabilities` NON e' stato lanciato**: misura la produzione
  ed e' rosso per costruzione fino al 50-11.

---

## Threat Model — le sei mitigazioni

| ID | Mitigazione | Come e' verificata |
|---|---|---|
| **T-50-16** | il percorso a zero non emette su una serata a pagamento | tre controlli indipendenti: `free-order-actions.ts:275`, `:314`, `:351` |
| **T-50-17** | emissione in massa da un endpoint pubblico | tetto per ordine e capienza **dentro** la transazione della RPC; **nessun limitatore di frequenza esiste**, dichiarato nel docblock del file e qui sopra |
| **T-50-18** | riscrittura dell'anagrafica di un conto esistente | il nome si scrive **solo alla creazione** (`guest-identity.ts:283`); grep `.from("profiles")…update` = **0** |
| **T-50-19** | il nome sul biglietto o allo schermo della porta | `holder_label` non compare in nessuno dei due moduli d'ordine (grep = 0); il nome vive su `ticket_orders.buyer_name` e su `profiles` |
| **T-50-20** | `reserve_ticket_order` concessa ad `anon`/`authenticated` | **nessun `GRANT` in questo piano**: l'azione passa dal client di servizio, con la giustificazione nel docblock e nel messaggio di commit |
| **T-50-21** | un ordine che risulta chiuso senza biglietti | nasce `pending` (`:391`); il ramo idempotente non e' imboccabile per sbaglio; una riserva che torna con zero biglietti **rifiuta** (`:480`) |
| **T-50-SC** | pacchetti installati | **nessuno**: `package.json` e `package-lock.json` non compaiono in nessuno dei cinque commit |

---

## Debito e note per chi viene dopo

- **50-05 deve aggiungere `Full name` al modulo dei tier**, o il percorso
  d'acquisto da ospite rifiuta con `guest_name_missing`. E' nel suo piano (task
  2), ed e' scritto anche nel tipo (`guest-purchase-actions.ts:238-249`).
- **`quantity` del livello a zero segue la capienza della serata**, e questo
  significa che un numero messo a mano su quel livello viene **riallineato** al
  prossimo salvataggio della serata. E' la conseguenza accettata di *«un numero
  ha una casa sola»*, non un effetto scoperto dopo.
- **`seed-lab-door.mjs:346-350` crea il livello `RSVP` da se'.** Dopo questo
  piano e' una **seconda strada** verso lo stesso oggetto: innocua (il
  `NOT EXISTS` del seme e la lettura di `ensureFreeRsvpTier` si tollerano), ma
  il banco non prova piu' il percorso vero. Chi risemina dopo il 50-05 lo tolga,
  o `P-50-7` misurera' un livello che non e' nato dove nasce in produzione.
- **Il pannello biglietti dell'organizer legge i livelli senza filtrare
  `access_type`** (`(work)/events/[id]/tickets/page.tsx:199-202`): oggi il
  livello `RSVP` non compare perche' il rendering cicla sulle serate a pagamento,
  ma e' una difesa che sta in un posto diverso da quello che la garantisce.
- **`verify:venue-surfaces` resta rosso su `payment/callback/actions.ts`**, dalla
  fase 49. Si chiude togliendo `sumup_checkout_id` da quella `select` — che oggi
  serve alla verifica dell'incasso — o dichiarandolo nella lista positiva con la
  sua ragione. **Non e' lavoro di questo piano**, ed e' riportato perche' il
  VERIFICATION della fase non lo scopra come nuovo.

---

## Known Stubs

Nessuno. L'azione e' completa dal primo passo all'ultimo; cio' che manca e' la
**superficie** che la chiama, dichiarata nel piano 50-05 e nominata qui sopra,
non uno stub lasciato indietro.

## Threat Flags

Una superficie nuova, **gia' dentro il registro del piano**: una Server Action
pubblica che conia un account e dei biglietti senza che nessuno paghi
(T-50-16/17/20/21). Nessun endpoint, nessuna policy e nessun permesso di
database sono stati aggiunti da questo piano.

---

## Self-Check: PASSED

| Cosa | Esito |
|---|---|
| `src/app/(public)/events/[slug]/free-order-actions.ts` | **esiste** |
| `src/lib/tickets/buyer-input.ts` | **esiste** |
| `.planning/phases/50-via-le-iscrizioni/50-04-SUMMARY.md` | **esiste** |
| i cinque commit `2d17c5f`, `b9d4f7a`, `228d50f`, `a65d7b8`, `f32a499` | **presenti in `git log`** |
| `git diff --diff-filter=D 0841578..HEAD` | **vuoto** — nessun file cancellato |
| le citazioni `file:riga` di questo SUMMARY | **riverificate una per una dopo l'ultimo commit**, e sette ranges di `free-order-actions.ts` sono stati **corretti**: erano stati scritti prima delle ultime due modifiche al file, ed erano sfalsati di qualche riga |
| `npm run build` | **exit 0** all'ultima esecuzione |
