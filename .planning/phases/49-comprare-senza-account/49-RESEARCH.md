# Phase 49: Comprare senza account — Research

**Researched:** 2026-09-05
**Domain:** ticketing-payments (primario) · access-gating · venue-secrecy · checkin-offline · comms-analytics · supabase-data
**Confidence:** HIGH sul codice letto in questo albero · MEDIUM sulle due verifiche esterne (Supabase, Resend) · dichiarata riga per riga sotto

> **Questo file e' pubblicato.** `.planning/` e' tracciato su un repository pubblico.
> Nessuna sede, nessuna data non annunciata, nessuna line-up, nessun nome di
> persona. Le scadenze sono **ancore**, mai giorni.

---

## Summary

Questa fase e' molto meno costruzione e molto piu' **ricomposizione** di quanto i
documenti datati facciano credere. Tre dei cinque requisiti hanno gia' un
precedente completo e funzionante in questo albero — l'acquisto da ospite
(`purchaseDrinksGuest`), l'identita' leggera creata dal server con link per la
password (`process-entry.ts` + `password-set-link.ts`), e l'ordine con piu' unita'
scansionabili (`drink_orders` -> `fulfill_drink_order` -> N `drink_tokens`). La
fase consiste nel portare quei tre meccanismi sul percorso del biglietto, non
nell'inventarli.

**Quattro affermazioni dei documenti a monte sono false contro il codice
corrente, e tre di esse cambiano il piano.** Il codice vince, e lo dico
esplicitamente: (1) `src/utils/qr.ts:49` **non genera il codice del biglietto** —
genera il codice di **membership**, ed e' per di piu' codice morto; il codice del
biglietto e' gia' `gen_random_uuid()` con firma HMAC. (2) La riparazione della
posta dichiarata come precondizione **e' gia' stata fatta** — registro, cron di
riconciliazione, quattro esiti, superficie admin. (3) `UNIQUE (event_id,
user_id)` su `tickets` **non esiste piu' da due migration**; al suo posto ci sono
due indici unici parziali, e il vincolo che ostacola davvero `BUY-01` e' un
altro: `tickets.sumup_checkout_id text UNIQUE`. (4) `actions.ts:97` non e'
l'acquisto: l'acquisto vive in `src/app/(admin)/admin/events/actions.ts:1265`.

**Raccomandazione primaria:** copiare la forma del percorso drink su tutta la
linea — un ordine, N righe biglietto, ognuna con la sua firma — creare l'identita'
leggera **al webhook e non all'avvio del checkout**, e trattare `BUY-05` come
**due lavori distinti** con due giustificazioni diverse, perche' il difetto che il
requisito nomina non e' quello che il requisito descrive.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Le sei decisioni del proprietario — 2026-08-22, prese con l'analisi d'impatto davanti**

1. **Un ospite puo' comprare un biglietto su TUTTE le serate**, non solo sui
   satelliti in locali pubblici.
2. **L'acquisto crea un account leggero al volo** — nessun modulo, nessuna
   password chiesta al momento di comprare.
3. **Il venue segreto NON viene rivelato all'acquisto.** La rivelazione resta
   dove sta oggi: al countdown, per mail, dal cron.
4. **Il link d'accesso porta a una schermata di scelta password** che *completa*
   l'account, cosi' si rientra da qualunque dispositivo.
5. **Il testo di quella schermata dice «Completa il tuo account»**, mai «diventa
   membro».
6. **Chi paga entra, e l'ingresso dalla cassa va attribuito e contato.**

**Il gate dei due assi — `member` non e' `approved`**

- **Il PAGAMENTO decide l'ammissione.** `src/app/api/webhooks/sumup/route.ts:88`
  porta il profilo a `status: "approved"` sul pagamento riuscito.
- **La PASSWORD completa l'accesso.** Non ammette nessuno.

**L'identita' e' vera nel database, ospite solo per chi compra.**

**Il tetto e' 6 per default, modificabile per serata (`BUY-02`).**

**L'attribuzione si attacca al BIGLIETTO, non allo stato del profilo** — non su
`approved_via`, che le fasi 50/51 smantellano.

**Il ritrovamento senza login ha gia' un precedente in questo codice (`BUY-04`).**

**Questa fase REVISIONA la decisione di milestone del 2026-08-14** («solo
organizer e staff potranno fare login»). Il resto di quella decisione resta.

**L'ancora temporale:** finita e provata **prima del primo listing pubblico della
milestone**.

### Claude's Discretion

- La forma dei piani e delle onde.
- Come si genera il codice del biglietto, purche' da `crypto` e non da
  `Math.random()`, e purche' lo spazio dei codici sia dichiarato nel piano.
- Dove vive il tetto per serata nello schema, purche' abbia un default.
- La forma della schermata di completamento account, dentro il vincolo del testo
  deciso al punto 5.

### Deferred Ideas (OUT OF SCOPE)

- **Via le iscrizioni** e **via le superfici da socio** — fasi 50 e 51.
- **Google Pay** — differito per decisione del proprietario, 2026-09-05.
- **Apple Pay sul merchant nuovo** — non verificato; si prova su un iPhone in
  Safari appena esistono dei tier in vendita.
- **Il nodo giuridico degli spazi privati** — chiuso per decisione informata del
  proprietario, 2026-08-15. **Non si riapre.**
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrizione (ROADMAP) | Cosa la ricerca ha trovato che la abilita |
|---|---|---|
| **BUY-01** | Un ordine puo' contenere **piu' biglietti**. | Il modello completo esiste gia': `drink_orders` (uno per checkout) -> RPC `fulfill_drink_order` -> N `drink_tokens`, ognuno con `id` proprio e firma HMAC propria (`20260306000000_phase9_drinks.sql:24-54`, webhook `route.ts:246-261`). Il blocco reale non e' `UNIQUE (event_id, user_id)` — non esiste piu' — ma `tickets.sumup_checkout_id text UNIQUE` (`20260225110000_phase6_ticketing.sql:28`). Vedi §3. |
| **BUY-02** | Tetto per ordine **6 di default, modificabile per serata**. | Precedente esatto da copiare: `event_parties.refund_request_window_hours integer NOT NULL DEFAULT 72` + `CHECK > 0` + `COMMENT` (`20260820110000_drink_refund_requests.sql:38-47`). Vedi §9. |
| **BUY-03** | L'acquisto **non richiede un account**: una mail basta. | Due precedenti: `purchaseDrinksGuest` per il checkout senza sessione (`menu/actions.ts:197-338`) e `auth.admin.createUser` + `buildPasswordSetLink` per l'identita' leggera (`process-entry.ts:235-283`, `password-set-link.ts:80-113`). Vedi §1 e §4. |
| **BUY-04** | I biglietti si ritrovano **senza login**. | Il modello e' `redeemDrinkTokenGuest` / `requestDrinkRefundGuest`: la credenziale e' **la firma HMAC**, verificata sul server prima che il client di servizio esegua (`menu/actions.ts:389-397`, `534-546`). Ostacolo attuale: `(public)/tickets/[id]/page.tsx:114-117` fa `auth.getUser()` e reindirizza a `/login`. Vedi §1 e §7. |
| **BUY-05** | Il codice del biglietto smette di nascere da `Math.random()` (`src/utils/qr.ts:49`). | **Il requisito riposa su una lettura errata del file.** La riga 49 sta dentro `generateMembershipCode()`, che e' **codice morto** e riguarda la membership card — che la fase 51 rimuove (`MEM-01`). Il codice del biglietto e' `tickets.id`, `gen_random_uuid()`. Vedi §5 per le due letture e cosa fare di ciascuna. |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Direttive attive che vincolano il piano. Il pianificatore le tratta come le
decisioni bloccate.

| Direttiva | Fonte | Conseguenza operativa su questa fase |
|---|---|---|
| **Non esiste test runner per il prodotto.** La verifica e' `npm run build` + procedure manuali **scritte**. | `CLAUDE.md` § Environment Guardrails 1 | Nessun piano puo' dichiarare «verificato» per via di test. Ogni piano che tocca denaro/porta/venue porta la sua procedura manuale scritta, passo per passo, con ruolo e osservabile. |
| **Le migration sono la fonte di verita' dello schema, non `schema.sql`.** | Guardrail 3 | Ogni affermazione di schema in questo documento e' letta dalle migration. `schema.sql` non e' stato usato. |
| **Il repository e' PUBBLICO.** | Guardrail 5 | Nessuna sede, data, line-up in `.planning/`. Rispettato qui. |
| **macOS/BSD:** `grep -E`, `sed -i ''`. | Guardrail 6 | Vale per i comandi di verifica automatica dentro i piani. |
| **`.planning/codebase/` e' invecchiato (Analysis Date 2026-02-24).** Verificare ogni voce contro il codice corrente. | Guardrail 4 | Applicato: quattro voci di documenti datati sono state trovate false, §0. |
| **Misura due volte, taglia una** su accesso, denaro, porta, segreto. | Operational Discipline 3 | Questa fase e' **Critical** su tutti e quattro. |
| **Gate VERIFICATION.md** con evidenza `file:riga` per requisito. | § Gate VERIFICATION.md | La fase deve chiudersi con `49-VERIFICATION.md` con citazioni concrete. |
| **`verify:persona` se si tocca `CLAUDE.md` o `.claude/**`.** | meta-gates | Se il piano corregge `access-gating.md` (vedi §5), rilanciarlo. |

---

## §0 — Dove il codice corrente contraddice i documenti datati

**Il codice vince. Queste quattro voci vanno corrette a monte, non aggirate nel piano.**

| # | Cosa dicono CONTEXT.md / ROADMAP / il todo | Cosa dice il codice, letto oggi | Impatto sul piano |
|---|---|---|---|
| **C1** | «`src/utils/qr.ts:49` genera il codice del biglietto con `Math.random()`» (`49-CONTEXT.md:92`, `ROADMAP` BUY-05, `guest-ticket-purchase.md:111`) | La riga 49 e' dentro `generateMembershipCode()` (`src/utils/qr.ts:45-52`), che produce `RSN-` + 8 caratteri e riguarda la **membership card**. **Nessun file in `src/` la importa** — verificato con grep globale: unica occorrenza e' la definizione stessa. Il codice del biglietto e' `tickets.id`, `uuid PRIMARY KEY DEFAULT gen_random_uuid()` (`20260225110000_phase6_ticketing.sql:24`), e il payload del QR e' `<uuid>.<hmac-sha256-hex>` (`qr.ts:4-10`). | **ALTO.** BUY-05 come scritto ripara una cosa che non e' sulla strada dell'ospite. §5 propone due letture e cosa fare di ciascuna. |
| **C2** | «La riparazione della posta e' un PREREQUISITO... `src/lib/email.ts:38` lancia solo su `error`» (`49-CONTEXT.md:183-199`) | `src/lib/email.ts` e' stato riscritto. `category` e' obbligatoria, esiste `email_deliveries` (`20260822130000`), un cron di riconciliazione (`vercel.json`, `0 9 * * *`), quattro esiti che non si collassano, e `classifyProviderEvent` **ha un ramo esplicito `suppressed`** (`categories.ts:172-179`). Il webhook dei biglietti gia' passa `category` e `ticketId` (`webhooks/sumup/route.ts:177-183`). | **ALTO.** La precondizione dichiarata **e' gia' soddisfatta**. Resta un residuo preciso e piccolo — §6 — non un'onda. |
| **C3** | «`UNIQUE (event_id, user_id)`... regge senza modifiche» (`49-CONTEXT.md:69-79`, `guest-ticket-purchase.md:43-54`) | Quel vincolo e' stato **eliminato** a `20260225150000_party_architecture.sql:129`, sostituito da `UNIQUE (party_id, user_id)`, a sua volta **eliminato** a `20260226300000_multi_sub_events.sql:57`. Oggi ci sono **due indici unici parziali**: `tickets_party_user_unique ON (party_id, user_id) WHERE party_id IS NOT NULL` e `tickets_event_user_master_unique ON (event_id, user_id) WHERE party_id IS NULL` (`multi_sub_events.sql:60-67`). | **ALTO.** La tensione esiste ancora, ma su **due** indici, piu' un terzo vincolo che nessun documento nomina: `tickets.sumup_checkout_id text UNIQUE`. §3. |
| **C4** | «l'acquisto parte da `auth.getUser()` (`src/app/(public)/events/[slug]/actions.ts:97`)» (`49-CONTEXT.md:167`, `STATE.md`) | Quel file oggi contiene **solo azioni media** — quattro esportazioni, nessuna di acquisto (`actions.ts:92,154,227,291`). La riga 97 e' dentro `validateMediaUpload`. L'acquisto e' `purchaseTicket` in **`src/app/(admin)/admin/events/actions.ts:1265`**, e il suo `auth.getUser()` e' alle righe **1267-1273**. | **MEDIO.** Solo un indirizzo sbagliato, ma manda il pianificatore sul file sbagliato. |

**Una quinta, minore:** `41.2-08-FINDINGS.md` e' citato in `(public)/tickets/[id]/page.tsx:55-61` come portatore di un'uscita venue **ancora aperta** sul pass Wallet. Quell'uscita e' **chiusa** dal 2026-08-24: la select del pass non chiede nessuna colonna di luogo (`api/tickets/[id]/wallet/route.ts:31-43`) ed e' misurata dal controllo **F** di `verify:venue-surfaces`.

---

## §1 — Il percorso ospite che esiste gia' (BUY-03, BUY-04)

**Domanda 1.** Tracciato per intero. Va **riusato**, non reinventato.

### 1a. L'acquisto senza sessione — `purchaseDrinksGuest`

`src/app/(public)/events/[slug]/menu/actions.ts:197-338`.

| Passo | Riga | Cosa fa | Perche' importa qui |
|---|---|---|---|
| Nessun `auth.getUser()` | 197 | La funzione **non chiede mai chi sta chiamando** | E' la prova che un Server Action di acquisto puo' esistere senza sessione in questo codice |
| `getServiceClient()` | 202 | Client di servizio, bypassa RLS | `access-gating.md` gate *service role*: va giustificato nel commit e nessun input non fidato deve raggiungerlo. Qui gli input sono id, e ogni riga viene riletta dal DB — non ci si fida dei prezzi del client (218-256) |
| Il prezzo si ricalcola sul server | 234-268 | `totalAmount` sommato dai prezzi letti dal DB | `ticketing-payments.md` gate *codice sconto*: il prezzo che conta e' quello del server |
| `orderId = crypto.randomUUID()` usato **sia** come `drink_orders.id` **sia** come `checkoutReference` | 285 | Una sola chiave per il ritorno post-3DS | Da copiare: risparmia un giro API SumUp al callback |
| `redirectUrl` con `?order=<id>&ctx=drink&party=<id>` | 295-300 | Il ritorno APM/3DS | Il percorso biglietto ha il gemello: `?purchase=<id>&ctx=ticket` (`admin/events/actions.ts:1557-1560`) |
| `insert({ user_id: null })` | 320-332 | L'ordine nasce **senza proprietario** | **Qui il biglietto divergera'**: la decisione 2 vuole un'identita' vera, quindi `tickets.user_id` non sara' mai `NULL` |

### 1b. Dove vive la ricevuta lato client

`localStorage`, chiave `resonate_drink_tokens_<eventId>` -> array di order id.
`GuestDrinkMenu.tsx:73,89` e `GuestTokenDisplay.tsx:32,129`.

Il commento a `GuestDrinkMenu.tsx:89` e' esplicito: *quella voce **e' la
ricevuta**: niente lato server*. **Per il biglietto questo non basta**, ed e' la
differenza di dominio piu' importante di tutta la fase: un drink perso costa un
drink; un biglietto perso e' una persona davanti a una porta. Il biglietto ha
**due** ricevute — la mail e il link con la password — e `localStorage` puo'
essere al massimo la terza, mai l'unica.

### 1c. La riconciliazione dopo il login — `claimGuestOrders`

`menu/actions.ts:346-379`, chiamata da `(auth)/login/page.tsx:113-120` e da
`GuestDrinkMenu.tsx:161`.

```
auth.getUser() -> se assente, esce con { claimed: 0 }        (356-360)
service client UPDATE drink_orders SET user_id = <chi ha fatto login>
  WHERE id IN (<gli id da localStorage>) AND user_id IS NULL  (365-370)
poi la stessa cosa sui drink_tokens dell'ordine                (372-377)
```

Il `.is("user_id", null)` e' la guardia: un ordine gia' rivendicato non si
ruba. **Per i biglietti questa funzione non serve** — se l'identita' e' vera dal
primo istante, non c'e' niente da rivendicare. Il piano non deve costruirne
l'equivalente: costruirlo significherebbe aver scelto `user_id NULL`, che la
decisione 2 esclude.

### 1d. Il ritrovamento senza login — il vero modello di BUY-04

`redeemDrinkTokenGuest` (`menu/actions.ts:389-397`) e `requestDrinkRefundGuest`
(`534-546`). La forma e' identica e vale la pena scriverla come pattern:

```
1. verifyTicketToken(signedToken) -> id, oppure null           (verifica HMAC)
2. se null: rifiuto con causa PROPRIA ("invalid_signature")
3. solo ORA il client di servizio legge la riga per id
4. guardie di dominio (stato, finestra) con una causa per ciascuna
```

Il docblock di `requestDrinkRefundGuest` (`529-534`) dichiara la ragione con le
parole del dominio: *«La credenziale e' la firma del token... dopo il perno della
v1.6 nessun cliente avra' un account affatto»*. **La strada per BUY-04 e' gia'
scritta da chi ha scritto quella riga.**

> **Nota lessicale, perche' il ROADMAP la sfuma.** BUY-04 dice «dalla credenziale
> del biglietto **e dalla mail**». Il percorso drink **non usa la mail**: la
> credenziale e' la sola firma. Sono due disegni diversi — firma-sola (un link
> che si apre) contro firma+mail (una seconda prova). Il primo e' quello che
> esiste; il secondo e' piu' stretto e piu' scomodo. **La scelta va dichiarata
> nel piano**, e §7 dice cosa cambia per il venue in ciascuno dei due.

---

## §2 — Il percorso biglietto oggi, e dove morde l'account

**Domanda 2.**

### La catena, con gli indirizzi corretti

| Tappa | File:riga | Nota |
|---|---|---|
| La UI della serata | `(public)/events/[slug]/TierSelection.tsx:301` | `purchaseTicket(partyId, selectedTierId, discount?.id ?? null)` — **nessun parametro di quantita', non esiste il concetto** |
| L'azione | `(admin)/admin/events/actions.ts:1265` | ⚠ **non** `(public)/events/[slug]/actions.ts:97`, vedi C4 |
| **Il morso 1 — la sessione** | `actions.ts:1267-1273` | `auth.getUser()`; `if (authError \|\| !user) throw new Error("Not authenticated")` |
| **Il morso 2 — il profilo** | `actions.ts:1277-1292` | legge `profiles.status`; rifiuta se `rejected`. Il commento a 1276 e' gia' del dominio giusto: *«pending users CAN purchase — approval happens on successful payment»* |
| **Il morso 3 — un biglietto solo** | `actions.ts:1445-1467` | `.eq("user_id", user.id).maybeSingle()` -> *"You already have a ticket for this sub-event"* / *"...an Event Pass..."* |
| Il checkout | `actions.ts:1563-1570` | `createCheckout` con `checkoutReference: purchaseId` |
| Lo stato pendente | `actions.ts:1571-1589` | `pending_purchases` con `user_id: user.id`, via client di servizio |
| **Il morso 4 — nel database** | `20260310100000_discount_codes.sql:110-126` | `reserve_ticket` ripete il controllo duplicato e solleva *"User already has a ticket for this"* |
| **Il morso 5 — gli indici** | `20260226300000_multi_sub_events.sql:60-67` | i due indici unici parziali |
| **Il morso 6 — il checkout** | `20260225110000_phase6_ticketing.sql:28` | `sumup_checkout_id text UNIQUE` su `tickets` |
| Il webhook | `api/webhooks/sumup/route.ts:22` | `getCheckout(body.id)` — **verifica sempre via GET**, mai il corpo |
| L'ammissione | `route.ts:84-88` | `.update({ status: "approved" }).eq("status","pending")` |
| La conferma | `route.ts:177-195` | `sendEmail({ category: "ticket_confirmation", userId, ticketId, attachments:[QR] })` |

### La modifica minima che toglie l'account

**Non e' rimuovere `auth.getUser()`.** E' spostarne l'esito: serve una **seconda
azione**, sorella di `purchaseDrinksGuest`, che prende un indirizzo mail invece
di una sessione. `purchaseTicket` resta com'e' per chi ha gia' una sessione — le
fasi 50/51 decideranno se sopravvive.

Il punto di disegno che il piano deve **dichiarare**, perche' non ha risposta
ovvia:

> **L'identita' leggera si crea all'AVVIO del checkout o al WEBHOOK?**
>
> | | All'avvio | Al webhook |
> |---|---|---|
> | `pending_purchases.user_id uuid NOT NULL REFERENCES auth.users` (`phase6:43`) | soddisfatto senza toccare lo schema | **richiede una migration**: la colonna deve diventare nullabile, oppure l'indirizzo va portato altrove |
> | Checkout abbandonati | producono un account fantasma per ogni carrello lasciato — e ogni account fantasma e' un `profiles` con `membership_code` e `status: 'pending'` (trigger `handle_new_user`, `20260310000000_guest_list.sql:91-155`) | nessuno: l'account nasce solo quando i soldi sono arrivati |
> | Indirizzo scritto male | l'account esiste con la mail sbagliata, e il posto e' occupato | l'account nasce comunque sbagliato — **il problema non si risolve da questo lato**, si osserva dal registro di consegna (§6) |
> | `ticketing-payments.md` gate *soldi vs contenuto* | crea contenuto prima dei soldi | rispetta l'ordine: prima l'incasso verificato, poi tutto il resto |
>
> **Raccomandazione: al webhook.** Il costo e' una migration su
> `pending_purchases`; il beneficio e' che nessun account nasce senza un
> pagamento verificato dietro, che e' esattamente la forma del gate *soldi vs
> contenuto*. E la migration e' comunque necessaria per BUY-01 (§3), quindi non
> e' un costo aggiuntivo: e' lo stesso file.

**Precedente per la collisione di indirizzo**, che il piano deve gestire: il
percorso guest list cerca **prima** su `profiles` con `.ilike("email", …)` e
biforca su esistente/nuovo (`process-entry.ts:162-232` contro `234-283`).
`auth.admin.createUser` su una mail gia' registrata **fallisce**: la
biforcazione non e' un ornamento.

---

## §3 — BUY-01 contro i vincoli di unicita': le opzioni, e la raccomandazione

**Domanda 3.** La tensione e' reale, ma **non e' quella che CONTEXT.md descrive**
(vedi C3). I vincoli veri, letti dalle migration, sono **tre**:

| # | Vincolo | Fonte |
|---|---|---|
| V1 | `tickets_party_user_unique ON tickets (party_id, user_id) WHERE party_id IS NOT NULL` | `20260226300000_multi_sub_events.sql:60-62` |
| V2 | `tickets_event_user_master_unique ON tickets (event_id, user_id) WHERE party_id IS NULL` | `20260226300000_multi_sub_events.sql:65-67` |
| **V3** | **`tickets.sumup_checkout_id text UNIQUE`** | `20260225110000_phase6_ticketing.sql:28` |

**V3 e' il vincolo che nessun documento a monte nomina, e blocca da solo l'opzione
piu' ovvia.** Sei biglietti da un solo checkout condividerebbero un solo
`sumup_checkout_id`: la seconda `INSERT` violerebbe l'unicita'. Qualunque
strada per BUY-01 deve dire cosa fa di V3.

### Le tre opzioni, valutate

#### Opzione A — una riga per biglietto, vincoli allentati

Sei righe `tickets`, stesso `user_id`, stesso checkout.

| Dimensione | Conseguenza |
|---|---|
| **Schema** | `DROP INDEX` su V1 e V2 (o riscritti includendo una colonna d'ordine); su V3: `DROP` dell'unicita' e **aggiunta di un indice non unico** — `supabase-data.md` gate *indici sulle colonne di lookup*, perche' il webhook e la riconciliazione cercano per checkout |
| **RLS** | **Nessun impatto.** `tickets_select_own USING (auth.uid() = user_id)` (`phase6:87-89`) e' vero su tutte e sei le righe. Nessuna policy nuova, nessuno scavalcamento — la proprieta' che il todo del 2026-08-22 rivendicava resta vera, per la ragione giusta (l'identita' e' vera) e non per quella scritta (il vincolo non c'e' piu') |
| **Porta** | ✅ **La forma giusta.** Ogni riga ha il suo `id`, quindi il suo `generateTicketToken(id)` e il suo QR. `TICKET_TOKEN_PATTERN` (`checkin/route.ts:104-105`) e la seconda scansione rifiutata funzionano invariati |
| **Rimborsi** | ✅ `ticket_refunds.ticket_id` e' per biglietto (`20260227200000:2`). Rimborsare 2 su 6 e' due righe. Nota: `requested_by uuid NOT NULL REFERENCES auth.users` — regge **solo perche'** l'identita' e' vera; con `user_id NULL` non reggerebbe, e la migration `20260820110000:14-17` lo dice esplicitamente per i drink |
| **`page.tsx:640`** | ⚠ **Si rompe in silenzio.** `(public)/events/[slug]/page.tsx:602-613` fa `.maybeSingle()`: con piu' righe PostgREST restituisce un errore, l'errore **e' scartato** (`const { data: ticket }`), `userTicket` resta `null`. Effetto: la pagina mostra di nuovo il bottone d'acquisto a chi ha gia' sei biglietti. Va convertita a `.select()` senza `maybeSingle`, e il ramo di render a 1492-1525 diventa un elenco |
| **`reserve_ticket`** | Il controllo duplicato (`discount_codes.sql:110-126`) va rimosso o parametrizzato, e la RPC deve emettere N righe in **una** transazione — altrimenti sei chiamate danno sei possibilita' di fallire a meta' |

#### Opzione B — una colonna `quantity` sulla riga

| Dimensione | Conseguenza |
|---|---|
| **Schema** | Minimo: una colonna. V1/V2/V3 restano |
| **RLS** | Nessun impatto |
| **Porta** | ❌ **Non funziona.** Un solo `tickets.id` = un solo QR. Sei persone non possono presentarsi con lo stesso codice: la seconda scansione dello stesso codice **deve** essere rifiutata (`checkin/route.ts`, e la verifica prescritta da `49-CONTEXT.md:213`). Servirebbe un contatore di ingressi per riga — cioe' reinventare il conteggio che `checked_in boolean` non fa, sul percorso dove `checkin-offline.md` dice che l'errore costa di piu' |
| **Rimborsi** | ❌ `ticket_refunds.amount` e' per riga: rimborsare 2 su 6 **non ha rappresentazione** |
| **`page.tsx:640`** | ✅ `maybeSingle()` continua a funzionare |

**Scartata.** Il costo alla porta e sui rimborsi e' esattamente dove il dominio
dice di non pagarlo.

#### Opzione C — split ordine / righe (il modello drink)

Una tabella d'ordine (nuova, o `pending_purchases` promossa) porta il checkout;
N righe `tickets` sono le unita'.

| Dimensione | Conseguenza |
|---|---|
| **Schema** | Come A per V1/V2, **ma V3 si risolve senza allentare niente**: `sumup_checkout_id` **esce** da `tickets` e vive sull'ordine, che ne ha uno solo. `tickets` guadagna `order_id`. E' letteralmente `drink_orders` / `drink_tokens` (`phase9_drinks.sql:24-54`) |
| **RLS** | Nessun impatto su `tickets`. La tabella d'ordine e' **nuova**: `supabase-data.md` gate *tabella nuova = policy nuova* — RLS abilitata e almeno una policy nella stessa migration. `drink_orders` e' il precedente |
| **Porta** | ✅ Identico ad A: una riga, un id, un QR |
| **Rimborsi** | ✅ Meglio di A: l'ordine porta `sumup_transaction_code` una volta sola, che e' cio' che il rimborso SumUp usa. Oggi quel codice e' duplicato su ogni riga `tickets` (`reserve_ticket` lo scrive per riga) |
| **`page.tsx:640`** | Stesso lavoro di A |
| **Costo** | Il piu' alto: una migration di spostamento colonna su una tabella del percorso del denaro |

### Raccomandazione: **Opzione C**, con una via d'uscita dichiarata

**Perche' C e non A.** A allenta `sumup_checkout_id UNIQUE`, e quell'unicita' non
e' decorativa: e' cio' che rende il webhook idempotente per costruzione — un
secondo `CHECKOUT_STATUS_CHANGED` non puo' emettere un secondo biglietto perche'
la riga esiste gia'. Toglierla sposta l'idempotenza dallo schema al codice, cioe'
in un posto dove si puo' dimenticare, **sul percorso del denaro**.
`ticketing-payments.md` gate *idempotenza* chiede di poterla **dimostrare**: con
C la si dimostra da una colonna `UNIQUE`, con A da un ragionamento.

**Perche' C e non B.** Sopra: la porta e i rimborsi.

**Perche' C e' anche il rischio piu' basso, contro l'apparenza.** Il momento e'
quello dichiarato in `49-CONTEXT.md:218`: **zero biglietti, zero ordini, zero
acquisti pendenti in produzione.** Una migration che sposta una colonna su una
tabella vuota non ha un percorso di backfill, non ha righe da salvare e non ha un
rollback complicato. **Questa finestra non si ripresenta**, ed e' il solo momento
in cui C costa meno di A.

**La via d'uscita, dichiarata perche' il piano non la scopra a meta':** se lo
spostamento di `sumup_checkout_id` fuori da `tickets` tocca piu' di quattro punti
di lettura, si ripiega su A **nella stessa onda**, non nella successiva. I punti
di lettura noti oggi sono: `reserve_ticket` (`discount_codes.sql:170-180`), il
webhook (`route.ts:47-59`), e le superfici admin dei venduti. **Non verificato**
che non ce ne siano altri: si chiude con `grep -rn "sumup_checkout_id" src/`
prima di scrivere la migration.

---

## §4 — Creare un'identita' leggera dal server

**Domanda 4.** Il codice ce l'ha gia', **due volte**, ed e' stato riparato dopo un
difetto misurato. Non va riscritto.

### Come questo codice crea un account oggi

**Percorso guest list** — `src/lib/guest-list/process-entry.ts:234-283`:

```
serviceClient.auth.admin.createUser({
  email: emailLower,
  email_confirm: true,
  user_metadata: { full_name: …, guest_list_event_id: … },
})                                                        (235-243)
-> se authError: throw                                     (245-247)
-> buildPasswordSetLink(serviceClient.auth.admin, emailLower, appUrl)  (271-275)
-> se fallisce: si prosegue con /login, con categoria di log propria   (280-283)
-> attesa 500 ms perche' il trigger handle_new_user scriva il profilo  (287)
```

**Percorso admin** — `(admin)/admin/members/actions.ts:2396` (stessa coppia).

### Il link, e il difetto che e' gia' stato pagato

`src/lib/auth/password-set-link.ts` — leggerlo per intero prima di toccare
questo percorso. In sintesi, misurato in laboratorio il 2026-08-19:

- `generateLink()` restituisce un `action_link` verso `/auth/v1/verify`, che
  produce un **flusso implicito**: la sessione torna nel **frammento**
  (`#access_token=…`). Il frammento **non viaggia verso il server**, il callback
  cerca `?code`, non lo trova, e rimanda a `/login?error=auth`. **E il token e'
  bruciato**: `verify` lo consuma comunque (`password-set-link.ts:12-21`).
- **Non si ripara con PKCE**: misurato, `generateLink` **ignora**
  `code_challenge` (`:24-26`).
- La riparazione e' usare `properties.hashed_token` e costruire un indirizzo
  **nostro**: `{APP_URL}/set-password?token_hash=<…>&type=recovery`
  (`:86-113`). `/set-password` e' una pagina client che chiama
  `verifyOtp({ token_hash, type })` e scambia il token **sul posto**
  (`SetPasswordForm.tsx:213`).
- **`recovery` e non `invite`**: `invite` crea l'utente (qui esiste gia') e non
  permette di impostare una password (`:38-42`).

### L'API corrente, verificata alla fonte

| Fatto | Verifica | Confidenza |
|---|---|---|
| `password` e' **opzionale** su `auth.admin.createUser` | [CITED: supabase.com/docs/reference/javascript/auth-admin-createuser] | HIGH |
| `email_confirm: true` auto-conferma l'indirizzo, saltando la verifica | [CITED: stessa pagina] | HIGH |
| Serve la **chiave `service_role`**; la pagina avverte: *«This function should only be called on a server. Never expose your `service_role` key in the browser.»* | [CITED: stessa pagina] | HIGH |
| `generateLink` accetta `signup · invite · magiclink · recovery · email_change_current · email_change_new`; `recovery` **pretende un utente esistente**; restituisce `hashed_token` e `action_link`; richiede `service_role` | [CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink] | MEDIUM — la pagina di riferimento e' generata, e la tabella dei tipi e' stata ricostruita dalla lettura, non citata alla lettera |
| `@supabase/supabase-js` installato: `^2.97.0` | `package.json:51` | HIGH |

**Conseguenza sul dove il codice puo' girare, e non e' un dettaglio.**
`SUPABASE_SERVICE_ROLE_KEY` e' letta da `src/lib/supabase/service.ts:6`. Ogni
percorso che crea l'identita' e' **server-only**: Server Action o route handler,
mai un componente client. `access-gating.md` gate *service role* chiede di
giustificarne ogni uso nuovo **per iscritto nel commit** e di provare che nessun
input non fidato lo raggiunge. Qui l'input non fidato **c'e'** — l'indirizzo mail
digitato da chi compra — quindi la giustificazione deve dire esattamente cosa
viene fatto di quella stringa prima che tocchi `createUser` (normalizzazione a
minuscolo come `process-entry.ts:160`, e lookup preventivo su `profiles`).

### Cosa il trigger fa senza chiedere, e che il piano deve sapere

`handle_new_user` (`20260310000000_guest_list.sql:91-155`) scatta su ogni
`auth.users` INSERT e scrive un `profiles` con:

- `membership_code` generato con **`random()` in plpgsql** (`:105`) — non
  crittografico, ed e' il difetto QR-01 vero (§5);
- `full_name` = `coalesce(metadata->>'full_name', '')` — **stringa vuota**, non
  NULL, quando nessuno l'ha dato (`:147`). Vedi §8: e' cio' che lo scanner
  mostrera';
- `role` = `'member'`, `status` = `'pending'` in assenza di metadata (`:136-137`).

`status: 'pending'` e' **corretto e voluto**: e' il pagamento che ammette, e il
webhook lo fa gia' (`route.ts:84-88`). Ma la finestra fra `createUser` e il
webhook e' una finestra in cui esiste un account `pending` — un'altra ragione per
creare l'identita' **al webhook** (§2).

---

## §5 — `src/utils/qr.ts` e BUY-05

**Domanda 5.** Il file per intero e' 52 righe. Letto oggi.

### Cosa contiene davvero

| Funzione | Righe | Cosa genera | Chi la importa |
|---|---|---|---|
| `generateTicketToken(ticketId)` | 4-10 | `` `${ticketId}.${HMAC_SHA256(ticketId, TICKET_SIGNING_SECRET)}` `` in hex | 5 file: `tickets/[id]/page.tsx:9`, `wallet/route.ts:3`, `webhooks/sumup/route.ts:10`, `guest-list/process-entry.ts:6`, e i drink |
| `verifyTicketToken(token)` | 12-31 | taglia sull'**ultimo** punto, ricalcola, `crypto.timingSafeEqual` | `checkin/route.ts:10`, `menu/actions.ts:8`, `admin/events/actions.ts:8` |
| `generateMembershipQR(code)` | 33-43 | data-URL di un QR verso `/api/membership/verify?code=` | `MembershipCardView.tsx:4` |
| **`generateMembershipCode()`** | **45-52** | `RSN-` + 8 caratteri da `Math.random()` — **riga 49** | **nessuno.** Grep globale su tutto il repo: zero importatori in `src/` |

### La risposta alla domanda, punto per punto

- **Cosa genera il codice del biglietto?** `gen_random_uuid()` di PostgreSQL, il
  default di `tickets.id` (`20260225110000_phase6_ticketing.sql:24`). Nessun
  codice applicativo lo genera.
- **Cosa genera la firma?** `crypto.createHmac("sha256", TICKET_SIGNING_SECRET)`
  su `ticketId` (`qr.ts:5-8`), verificata in tempo costante (`:22-27`).
- **Alfabeto e lunghezza del payload QR?** `[0-9a-f]{8}-…-[0-9a-f]{12}` + `.` +
  `[0-9a-f]{64}`. **97 caratteri esatti**, fissati da
  `TICKET_TOKEN_PATTERN` in **due posti**: `checkin/route.ts:104-105` e
  `ScannerClient.tsx:67`.
- **Superficie di collisione / indovinabilita' oggi?** UUID v4 = 122 bit casuali
  da CSPRNG; la firma aggiunge 256 bit che **non si producono senza il segreto**.
  Indovinare un biglietto valido richiede di indovinare la firma. **La
  credenziale del biglietto e' gia' forte**, e lo e' anche quando diventa l'unica
  prova d'acquisto.
- **Superficie del codice di membership?** `RSN-` + 8 caratteri da un alfabeto di
  32 = **40 bit**, da un generatore non crittografico. Enumerabile, e
  `access-gating.md` gate *nessun rate limiting, oggi* dice che
  `api/membership/verify` e' un oracolo interrogabile senza costo. **Questo e' il
  difetto vero**, e non e' sulla strada di un biglietto d'ospite.

### Cosa dipende dalla forma del codice

| Dipendente | Riga | Cosa assume |
|---|---|---|
| Il route della porta | `checkin/route.ts:896,904` | `TICKET_TOKEN_PATTERN` prima di `verifyTicketToken` |
| Lo scanner | `ScannerClient.tsx:67,2424` | la **stessa** regex, duplicata |
| La lettura a mano | `ScannerClient.tsx:182` | *«taglia all'**ultimo** punto, come fa `verifyTicketToken`»* |
| Il pass Wallet | `wallet/route.ts:65` | `qrValue = generateTicketToken(ticket.id)` |
| I token drink | `phase9_drinks.sql:49` + `webhooks/sumup/route.ts:255` | `drink_tokens.token text NOT NULL UNIQUE`, riscritto con la firma dopo il pagamento |
| Il DB | — | nessuna colonna porta il token del biglietto: e' **calcolato**, mai conservato. Nessuna larghezza da cambiare |

**Conseguenza netta: cambiare la forma del codice del biglietto significa toccare
due regex duplicate, il pass e la porta — su un percorso che oggi e' gia'
crittograficamente solido.** Il rapporto costo/beneficio e' sfavorevole.

### Le due letture di BUY-05, e la raccomandazione

**Lettura 1 — letterale («la riga 49»).** Riparare `generateMembershipCode`.
Costo: quasi nullo. Beneficio: **nullo**, perche' e' codice morto e la fase 51
rimuove la membership card (`MEM-01`). Il generatore che conta e' il `random()`
del trigger SQL, che non e' quella riga.

**Lettura 2 — d'intento («il codice del biglietto e' l'unica prova che qualcuno
ha pagato, quindi dev'essere forte»).** La proprieta' che il requisito vuole
**e' gia' vera**: UUID CSPRNG + HMAC.

**Raccomandazione al pianificatore — tre voci, non una:**

1. **Cancellare `generateMembershipCode()` invece di ripararla.** Zero
   importatori: e' una funzione che aspetta il primo chiamante distratto. Una
   riga di `git rm` sulla funzione chiude la lettura letterale di BUY-05 in modo
   piu' onesto di una riparazione.
2. **Registrare, come esito misurato di BUY-05, che il codice del biglietto e'
   gia' `gen_random_uuid()` + HMAC**, con le citazioni di §5. Questo *e'*
   soddisfare il requisito nella sua lettura d'intento, e va scritto nel
   `49-VERIFICATION.md` con l'evidenza, non dichiarato.
3. **Portare il difetto vero dove appartiene.** Il `random()` del trigger
   (`20260310000000_guest_list.sql:105`) e i 40 bit del codice di membership
   sono **debito della fase 51**, che rimuove quella superficie. Se 51 non lo
   rimuovesse, tornerebbe come debito dichiarato. **Non e' lavoro della 49**, e
   trattarlo qui significherebbe irrobustire un identificatore che la milestone
   sta per cancellare.

> ⚠ **Una correzione documentale che vale la pena fare nella stessa onda.**
> `.claude/rules/access-gating.md`, gate *entropia degli identificatori*, dice
> «`src/utils/qr.ts:49` genera il codice di membership con `Math.random()` —
> **difetto attualmente presente e confermato**». La prima meta' e' corretta (dice
> *membership*, non *biglietto*); la seconda e' **imprecisa**: quella funzione non
> e' chiamata da nessuno, e il difetto presente e' nel trigger SQL. Se il piano
> cancella la funzione, quel gate va aggiornato **nello stesso commit** e
> `npm run verify:persona` va rilanciato (`meta-gates.md`, e la memoria
> *verify:persona dopo aver cancellato superfici*).

---

## §6 — La mail che porta tre cose

**Domanda 6.** `src/lib/email.ts` **non e' piu' il file descritto da CONTEXT.md**
(C2). La riparazione e' fatta. Ecco cosa esiste e cosa manca.

### Cosa esiste gia'

| Pezzo | Dove | Cosa fa |
|---|---|---|
| `category` obbligatoria, unione chiusa di 11 voci | `email-delivery/categories.ts:47-90` | il compilatore garantisce che ogni invio sia registrabile e distinguibile |
| Il registro | `20260822130000_email_delivery_ledger.sql` | `email_deliveries`, `provider_message_id UNIQUE`, RLS **abilitata con zero policy** (solo `service_role`) |
| Quattro esiti che non si collassano | `categories.ts:112-130` | `unverified` · `delivered` · `undelivered` · `unknown` |
| **Il ramo `suppressed`** | `categories.ts:172-179` | classificato `undelivered` con la frase in chiaro. Letto come **stringa grezza** e non col tipo dell'SDK, perche' l'unione di `resend@6.9.2` **non contiene `suppressed`** (`categories.ts:135-152`) |
| La riconciliazione | `email-delivery/ledger.ts:242+` | `resend.emails.get(id)` — la stessa disciplina del GET checkout, spostata sulla posta |
| Il cron | `vercel.json`, `/api/cron/reconcile-email-deliveries`, `0 9 * * *` | la spazzata |
| La lettura a richiesta | `admin/(work)/events/[id]/tickets/page.tsx:366-389` | riconcilia **prima di disegnare**, perche' un biglietto comprato la sera non ha una notte davanti |
| Il webhook biglietti gia' aggiornato | `webhooks/sumup/route.ts:177-183` | passa `category`, `userId`, `ticketId` |

### La verifica esterna, rifatta oggi alla fonte

Non ripresa dal documento del 2026-08-22. Confermata in modo indipendente:

> *«Whenever you send an email with Resend, the recipient is checked against the
> suppression list. If they're on it, the delivery is suppressed... When sending
> to an email address results in a hard bounce or spam complaint, Resend places
> this address on the Suppression List. Future emails to addresses on the list
> will be marked as suppressed and won't be delivered until the address is
> removed. Common reasons: the recipient's email address contains a typo, doesn't
> exist, or the recipient's email server has permanently blocked delivery.»*

[CITED: resend.com/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list] — confidenza MEDIUM (letto da risultati di ricerca, non dalla pagina scaricata: `firecrawl` ha risposto `Request failed` su questa origine e la pagina `/dashboard/emails/suppression-list` restituisce 404).

**Il codice del prodotto e' allineato a questa fonte.**

### Cosa manca ancora, ed e' piccolo e preciso

| Gap | Evidenza | Perche' conta per l'ospite |
|---|---|---|
| **G1. Nessuna categoria per la mail dell'ospite** | `CHECK` a `20260822130000:78-88` (9 voci) + `20260822180000` (le due di lotto) = 11. Nessuna copre «biglietto + link d'accesso» | Se il piano manda **una** mail che porta biglietto e link, quella mail non ha una categoria. `categories.ts:52-54` avverte: aggiungerne una costa **due modifiche in un commit** — l'unione TS e il `CHECK` — e farne una sola produce un invio che parte e non si registra |
| **G2. Il registro non conserva l'indirizzo** — per decisione | `20260822130000:44-53`: *«L'indirizzo... e' gia' su `profiles` e si risolve da `user_id`»* | Regge, **perche' l'ospite ha un `user_id` vero**. Sarebbe rotto con `user_id NULL`. E' un'altra conferma della decisione 2 |
| **G3. Nessuna superficie mostra l'esito a chi ha comprato** | `20260822130000:105-120`: nessuna policy utente, *«il valore per chi ha comprato non e' sapere che la mail non e' arrivata, e' avere il biglietto comunque»* | **Questa e' la meta' che manca, e la fase 49 e' la fase che la deve costruire.** L'altra meta' della riparazione, dichiarata in `ledger.ts:38-42`, e' *«che il biglietto non dipenda piu' da quella mail»*. Per un membro il ripiego e' il login; per un ospite **non c'e' ripiego**, a meno che il piano non gliene dia uno |

### La modifica minima che rende osservabile una mancata consegna a un ospite

Il registro **gia'** rende il fatto leggibile a chi organizza. Manca il verso
opposto: **una strada che non passa dalla mail**.

> **Raccomandazione.** Alla fine del checkout, la schermata di conferma mostra il
> biglietto — QR compreso — e il suo link permanente, **senza attendere la mail**,
> con una frase che dice che quel link e' la via di rientro. E' la stessa forma
> gia' scelta il 2026-08-22 per la pagina della serata: *«You never need to open
> the email — showing the QR code from the ticket is enough»*
> (`(public)/events/[slug]/page.tsx:1514-1516`).
>
> **Perche' e' la modifica minima e non un ripiego.** `meta-gates.md` chiede a un
> fallimento che conta un **effetto osservabile**, non una riga di log. Qui
> l'effetto non e' un segnale d'errore: e' che **il fallimento smette di
> contare**. Una mail non consegnata a chi ha gia' il biglietto sullo schermo e'
> rumore; a chi non ha nient'altro e' una persona alla porta.

**Conseguenza sull'ordinamento (§10): la riparazione della posta NON e' piu' una
precondizione.** Lo era quando `email.ts` lanciava solo su `error`. Oggi la
precondizione e' un'altra: **la conferma a schermo**, che e' lavoro di questa
fase, non lavoro a monte di essa.

---

## §7 — La segretezza del venue su un flusso nuovo

**Domanda 7.** `venue-secrecy.md` gate *percorsi enumerati*: **rienumerati
leggendo il codice**, non ripresi dalla lista datata.

### Il predicato, e la sua unica casa

`src/lib/venue-reveal/venue-disclosure.ts` — due funzioni:

- `mayShowVenueOnPublicSurface(night)` — **un solo termine**: notte segreta, mai.
  Nessun ramo per il ruolo, e l'assenza e' la decisione (`:104-116`).
- `mayShowVenueToTicketHolder(...)` — al titolare, **appena la rivelazione
  scatta**.
- `isNightSecret(v)` e' `v !== false`: **tutto cio' che non e' un `false`
  conservato e' segreto** (`:94-96`). Gate *default chiuso*.

### Le superfici del percorso ospite, una per una

| Superficie | Copertura oggi | Cosa deve fare il piano |
|---|---|---|
| **La pagina della serata** (dove si compra) | ✅ `mayShowVenueOnPublicSurface`, misurata dai controlli B/C/E di `verify:venue-surfaces` | Nulla. Ma se il flusso ospite aggiunge un componente `"use client"` su quella pagina, **il controllo E lo spazza**: cerca i nomi grezzi delle colonne venue in ogni `"use client"` sotto `src/app/(public)/` |
| **La conferma d'acquisto / il ritorno dal pagamento** | ❌ **Superficie nuova, nessuna copertura** | Se mostra il biglietto (raccomandato, §6), deve leggere `mayShowVenueToTicketHolder` — o non toccare il venue affatto. **La decisione 3 e' esplicita: il venue non si rivela all'acquisto.** La strada piu' semplice e piu' verificabile e' **non selezionare `venue_text`** su quella superficie: una colonna che non si legge non si puo' stampare |
| **La schermata del biglietto d'ospite (senza login)** | ❌ **Superficie nuova.** L'unica esistente, `(public)/tickets/[id]/page.tsx`, e' chiusa dietro `auth.getUser()` (`:114-117`) | ⚠ **Il punto piu' delicato dell'intera fase.** Vedi il riquadro sotto |
| **La ricevuta** | Non esiste una superficie ricevuta separata: SumUp emette la sua | Nessuna colonna venue esce da qui. **Non verificato** cosa SumUp mostra nel proprio riepilogo: la `description` del checkout e' `` `${event.title} - ${tier.name}` `` (`admin/events/actions.ts:1566`) — **titoli, testo libero**. Il gate *un posto scritto nel titolo* di `venue-secrecy.md` vale identico qui |
| **La mail di conferma** | ✅ `TicketConfirmationEmail` non riceve nessun campo venue (`webhooks/sumup/route.ts:146-158`) | Se il piano fonde biglietto e link in **una** mail, la nuova mail non deve guadagnare un campo venue |
| **La mail di rivelazione** | ✅ Percorso separato, per destinatario, `venue_reveal_sent` per riga | Vedi il riquadro sotto |
| **Il pass Wallet** | ✅ **Chiuso il 2026-08-24**: la select non chiede colonne di luogo (`wallet/route.ts:31-43`), misurato dal controllo **F** | Il pass richiede `auth.getUser()` (`:23-28`) e `.eq("user_id", user.id)` (`:44`): **un ospite senza password non puo' scaricarlo**. Conseguenza accettabile o no — **decisione del proprietario, non del piano** |

> ### ⚠ Il buco che questa fase apre, e che va chiuso dentro questa fase
>
> `venue-secrecy.md` elenca fra i casi **non coperti**: *«**chi compra dopo la
> rivelazione**, la cui mail e' un secondo percorso, **ancora aperto**»*.
>
> Il codice lo conferma e ne dichiara la ragione, `api/cron/venue-reveal/route.ts:186-201`:
>
> > *«`venue_revealed_at` is the instant somebody pressed the button. When it is
> > set, this run may only reach people who already existed then: **whoever bought
> > a ticket AFTER the reveal sees the address on the page and gets no mail**»*
>
> **«Sees the address on the page» significa `(public)/tickets/[id]/page.tsx`, che
> richiede un login.** Per un membro va bene. **Per un ospite che non ha mai
> scelto una password, non esiste nessuna pagina, quindi non esiste nessun
> indirizzo.** Ha pagato e non sa dove andare.
>
> **Quindi la schermata del biglietto d'ospite non e' una comodita': e' l'unica
> via per l'indirizzo su un intero ramo di acquirenti**, e deve leggere
> `mayShowVenueToTicketHolder` dallo stesso file, mai riscriverne il predicato.
>
> `venue_reveal_email_sent` resta un interruttore a senso unico e **questa fase
> non lo tocca**: non lo alza, non lo abbassa, non ne cambia le condizioni. La
> guardia monotona regge.

### Il controllo automatico va esteso, o mentira'

`scripts/verify-venue-surfaces.mjs` conosce **esattamente due** superfici,
codificate a `:93-95`:

```
const PUBLIC_PAGE = join(ROOT, "src/app/(public)/events/[slug]/page.tsx");
const TICKET_PAGE = join(ROOT, "src/app/(public)/tickets/[id]/page.tsx");
```

I controlli **B** (una sola casa del predicato) e **C** (nessun render non
gated) operano **solo su quei due file**.

> **Una terza superficie che mostra il venue e che il gate non conosce e' peggio
> di nessun gate**, per la ragione che `meta-gates.md` scrive di se stesso: *«fa
> credere che qualcuno stia controllando»*. **Il piano deve estendere
> `verify-venue-surfaces.mjs` nella stessa onda che crea la superficie, non
> dopo.** Il file stesso lo chiede a `:688`: *«remove check F in the same commit
> and say so — do not leave a gate that…»*.

### Il confine, che nessuna superficie stringe

`public.venue_for_parties`, concessa a `authenticated`, risponde ancora con
l'indirizzo di una serata segreta via `POST /rest/v1/rpc/`. **Piu' largo di ogni
pagina, ed e' la direzione sicura**, ma va detto: con l'account leggero,
`authenticated` include ora **chi ha comprato un biglietto**. Il perimetro di
quella funzione si allarga come effetto collaterale di questa fase.
**Non verificato** se il suo corpo porta gia' un termine di titolarita' per
serata: si chiude leggendo `20260810161000_venues_read_narrowed.sql` per intero
prima di pianificare, ed e' un elemento da mettere davanti al proprietario se il
termine non c'e'.

---

## §8 — La porta

**Domanda 8.** Un biglietto d'ospite scansiona **senza alcuna modifica al
percorso della porta**. Ecco perche', e cosa invece non funziona.

### Perche' scansiona

La catena e' identica per chiunque, `api/tickets/checkin/route.ts`:

1. `TICKET_TOKEN_PATTERN.test(rawToken)` (`:896`) — forma.
2. `verifyTicketToken(rawToken)` -> `ticketId` (`:904`) — firma HMAC.
3. Il client di **servizio** legge il biglietto per `id` (`:913-936`).

**Nessuno di questi passi guarda `profiles.status`, `profiles.role`, o chiede una
sessione all'ospite.** La sessione che serve e' quella dello **staff**, non del
titolare. Un biglietto d'ospite e' un biglietto.

C'e' anche un difetto **gia' riparato** che vale la pena conoscere, perche' dice
qualcosa sullo schema: `profiles` **non si incorpora** nella select del biglietto
— PostgREST risponde `PGRST200`, perche' `tickets.user_id` referenzia
`auth.users(id)` e **non** `public.profiles` (`checkin/route.ts:915-927`). Ogni
scansione rispondeva `500`. Non si e' mai visto in produzione perche' non c'e' mai
stata una scansione. La stessa trappola e' documentata in
`reveal-party-venue.ts:352-371`. **Il piano non deve aggiungere un `profiles(...)`
incorporato da nessuna parte su `tickets` o `rsvps`.**

### Offline

`src/lib/offline/checkin-store.ts`. Il dispositivo scarica in anticipo un elenco
di presenti (`AttendeeRecord`, `:131-157`) con `ticketType: "purchased" |
"guest_list"`, e `checkInLocally` (`:841+`) ammette in locale mettendo in coda la
sincronizzazione. **Nulla in questo percorso conosce l'identita' del titolare
oltre al nome memorizzato.** Un ospite funziona.

Vale l'asimmetria di `checkin-offline.md`, e va nella procedura manuale: se il
biglietto **non e'** in cache — comprato dopo lo scarico — il rifiuto e' l'errore
caro. **Non verificato** come si comporta il ramo `!wasCached`: `checkInLocally`
ha `wasCached` a `:864` ma la sua conseguenza sulla decisione non e' stata letta
in questa sessione. **Si chiude leggendo `checkin-store.ts:841-960` e
`ScannerClient.tsx` prima di scrivere il piano dell'onda della porta**, ed e' un
punto che il piano deve verificare a mano, perche' un ospite che compra il giorno
stesso e' il caso normale, non l'eccezione.

### Il nome che lo scanner mostra — e qui c'e' un difetto reale

La catena:

- `handle_new_user` scrive `full_name = coalesce(metadata->>'full_name', '')` —
  **stringa vuota** (`20260310000000_guest_list.sql:147`).
- Il payload della presenza fa `profileMap.set(p.id, p.full_name ?? "Unknown")`
  (`api/tickets/attendance/route.ts:734`) e poi
  `name: profileMap.get(t.user_id) ?? "Unknown"` (`:760`).
- L'archivio offline fa `name: local?.name ?? opts.name ?? "Unknown"`
  (`checkin-store.ts:872`).

**`?? "Unknown"` intercetta `null`, non `""`.** Un ospite che non ha mai dato un
nome ha `full_name = ''`, quindi `profileMap` contiene la stringa vuota, quindi
`??` non scatta, quindi **lo scanner mostra una riga senza nome** — non
«Unknown», il **vuoto**. Alle due di notte, con una fila, e' una riga che non
dice niente e non dice nemmeno che non sa.

**Tre risposte possibili, e il piano ne deve scegliere una dichiarandola:**

| | Cosa | Costo |
|---|---|---|
| a | Chiedere il nome all'acquisto | Contraddice la decisione 2, *«nessun modulo»*. **Scartata salvo decisione del proprietario** |
| b | Trattare `''` come `null` alle tre righe sopra, e mostrare qualcosa di risolvibile — il tier, le ultime cifre del codice, la posizione nell'ordine | Tre righe. Ma «Unknown» su meta' di una serata e' un elenco inutilizzabile |
| c | Scrivere sul biglietto un'**etichetta di titolare** al momento dell'emissione — parte locale dell'indirizzo mail, o «Ospite 3 di 6» per un ordine multiplo — e farla leggere al payload | Una colonna, ma **risolve anche BUY-01**: sei biglietti dello stesso ordine devono essere distinguibili alla porta, e sei righe con lo stesso nome non lo sono |

> **Raccomandazione: (c).** E' l'unica che risponde contemporaneamente alla
> domanda 8 e alla conseguenza di BUY-01, e non chiede niente a chi compra.
> `49-CONTEXT.md:212` chiede che *«il nome che lo scanner mostra sia
> risolvibile»*: sei righe vuote identiche non lo sono.
>
> ⚠ `comms-analytics.md` gate *PII* e `legal-compliance.md` gate *i dati dei soci
> non sono i dati del prodotto*: se l'etichetta e' derivata dall'indirizzo mail,
> **e' un pezzo di PII su una superficie che sta in mano allo staff alla porta**.
> Va deciso esplicitamente, non derivato.

### L'attribuzione (decisione 6)

Il precedente da copiare **non e'** `approved_via` — CONTEXT.md lo esclude, ed e'
in via di smantellamento. Il precedente giusto e'
**`attendances.entry_role`** (`20260808003000_attendances_entry_role.sql`), e le
sue tre proprieta' vanno riprese alla lettera:

1. **Nessuna chiave esterna, nessun join**: *«evidenza di cosa era vero alla
   porta, non un puntatore a cosa e' vero adesso»* (`:81-88`). Un profilo che
   cambia non deve cambiare il numero di una serata gia' passata.
2. **Nullabile e senza default**: *«NULL significa "scritto prima che questa
   colonna esistesse". NULL NON significa "questo era un membro ordinario"»*
   (`:47-49`). Un default fabbricherebbe un numero che si legge come misurato.
3. **Nessun backfill.** *«L'unico valore disponibile a un backfill e' il ruolo
   CORRENTE dell'account, che e' precisamente il valore che la decisione 2 esiste
   per rifiutare»* (`:58-62`).

Applicato: una colonna d'evidenza **sul biglietto** che dice come quell'ingresso
e' stato acquisito, scritta all'emissione, mai dedotta dopo. E `attendances`
resta il posto per il fatto della **presenza** — cosi' l'attribuzione sopravvive
alle fasi 50/51, che e' la ragione per cui CONTEXT.md la sposta li'.

---

## §9 — Il tetto per serata (BUY-02)

**Domanda 9.** C'e' un precedente esatto, ed e' recente.

### Cosa esiste che assomiglia a un numero configurabile per serata

| Colonna | Tipo | Fonte |
|---|---|---|
| `refund_request_window_hours` | `integer NOT NULL DEFAULT 72` + `CHECK > 0` + `COMMENT` | `20260820110000_drink_refund_requests.sql:38-47` |
| `venue_reveal_hours` | `integer` **nullabile, senza default** | `20260226500000:3` |
| `menu_closes_at` | `time` nullabile | `20260307000000:4` |
| `capacity` | `integer` nullabile | letta a `(public)/events/[slug]/page.tsx:504` |

**Il modello da copiare e' `refund_request_window_hours`**, e la sua migration
spiega perche' in termini di dominio (`:24-30`): *«Sta su `event_parties`... e non
come costante di prodotto, perche' e' una proprieta' DELLA SERATA... una costante
globale toglierebbe quella possibilita' senza guadagnare nulla»*. Vale identico
per il tetto: sei per un satellite in un locale pubblico e sei per una notte da
300 persone non sono necessariamente lo stesso numero.

**`venue_reveal_hours` e' il contro-modello**, e va evitato: nullabile e senza
default, il suo valore effettivo vive in un `coalesce(..., 25)` scritto in **due
posti** — la migration e `src/utils/datetime.ts` — e la migration stessa lo
denuncia in maiuscolo (`20260810161000_venues_read_narrowed.sql:576`): *«THE 25 IN
`coalesce(venue_reveal_hours, 25)` LIVES IN TWO PLACES»*. Una seconda casa per un
default e' un secondo default in attesa di divergere.

### Raccomandazione

```sql
ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS max_tickets_per_order integer NOT NULL DEFAULT 6;
ALTER TABLE public.event_parties
  DROP CONSTRAINT IF EXISTS event_parties_max_tickets_per_order_check;
ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_max_tickets_per_order_check
  CHECK (max_tickets_per_order > 0);
COMMENT ON COLUMN public.event_parties.max_tickets_per_order IS '…';
```

`NOT NULL DEFAULT` invece che nullabile: **una casa sola per il numero**.

**Dove si applica il tetto — e questa parte non e' opzionale.**
`ticketing-payments.md` gate *codice sconto* fissa il principio: *«ogni nuovo
vincolo va applicato al momento del checkout server-side, mai solo nella UI»*.
E c'e' il precedente in casa: `max_uses` del codice sconto e' controllato **due
volte** — in modo consultivo nell'azione (`admin/events/actions.ts:1512-1531`,
con un docblock che ammette che il conteggio non letto **apre** il limite) e in
modo autoritativo **dentro `reserve_ticket`**, che blocca la riga
`FOR UPDATE` (`discount_codes.sql:147-167`).

> **Il tetto segue la stessa forma: consultivo nella UI e nell'azione, autoritativo
> dentro la RPC che emette le righe, nella stessa transazione.** Solo li' e' a
> prova di due richieste in volo, ed e' l'unica forma che regge la ragione per cui
> il tetto esiste — *«una persona che ne compra cinquanta e li rivende»*
> (`ROADMAP`).

**Dichiarare anche cosa il tetto NON fa:** e' per **ordine**, non per persona. Sei
ordini da sei sono trentasei biglietti, e nessuna delle due opzioni di §3 lo
impedisce. **Non e' un difetto, e' il perimetro di BUY-02** — ma va scritto, o
qualcuno leggera' «tetto» come «limite per persona» e credera' che una cosa sia
protetta quando non lo e'.

---

## §10 — Ordinamento: cosa deve venire prima di cosa

**Domanda 10.** Quattro precondizioni **dure** (una cosa non funziona senza
l'altra) e due preferenze.

### Precondizioni dure

| # | Prima | Poi | Perche' e' dura, non una preferenza |
|---|---|---|---|
| **P1** | **La decisione su §3** (opzione C raccomandata) | Tutto il resto | La forma dell'ordine determina la firma della RPC, la forma del webhook, la superficie del biglietto e la forma dell'attribuzione. Deciderla dopo significa riscrivere ognuna di quelle. `49-CONTEXT.md:86` lo chiede gia': *«va dichiarata nel piano, non scoperta durante l'esecuzione»* |
| **P2** | **La migration** (ordine + tetto + colonna d'attribuzione + etichetta del titolare) e **`src/types/database.ts` nello stesso commit** | Ogni codice che legge le nuove colonne | `supabase-data.md` gate *tipi allineati*: *«un tipo che mente e' peggio di un tipo assente, perche' il compilatore conferma un errore»*. E in un repo senza test runner il compilatore e' l'unico controllo automatico che esiste |
| **P3** | **La superficie del biglietto d'ospite** (senza login, con `mayShowVenueToTicketHolder`) **e l'estensione di `verify-venue-surfaces.mjs`, nello stesso commit** | Qualunque annuncio o listing | Due ragioni indipendenti. (a) §7: e' l'unica via per l'indirizzo per chi compra dopo la rivelazione, e senza di essa un ospite paga e non sa dove andare. (b) Una superficie che mostra il venue e che il gate non conosce fa credere che qualcuno stia controllando. **Le due meta' non si separano**: la superficie senza il gate e' peggio di nessuna delle due |
| **P4** | **La conferma a schermo con QR e link permanente** | Il primo acquisto reale | §6, G3. E' cio' che rende il biglietto indipendente dalla mail. Finche' non c'e', l'ospite ha **una** via di rientro invece di due, e quella via passa da un fornitore che sopprime in silenzio |

### Preferenze, non precondizioni

| | Cosa | Nota |
|---|---|---|
| **F1** | La cancellazione di `generateMembershipCode()` (§5) e la correzione di `access-gating.md` | Indipendente da tutto. Puo' stare in qualunque onda, anche la prima, e chiude la lettura letterale di BUY-05 |
| **F2** | L'etichetta del titolare (§8c) | Puo' arrivare con la migration P2 o subito dopo, ma **prima della prima porta esercitata**, che nel calendario di questa milestone e' la prima serata satellite |

### La precondizione che CONTEXT.md dichiara e che il codice ha gia' soddisfatta

`49-CONTEXT.md:183-199` chiede che la riparazione della posta sia trattata come
precondizione di un'onda. **Lo era il 2026-08-22; non lo e' piu'** (C2, §6). Il
registro, il cron, i quattro esiti, il ramo `suppressed` e la superficie admin
esistono.

**Cio' che resta e' dentro la fase, non a monte:** le due modifiche in un commit
per la categoria nuova (G1) e la conferma a schermo (P4). **Il pianificatore non
deve costruire un'onda per un lavoro gia' fatto** — ma deve **verificarlo**, non
fidarsi di questa riga: `git log --oneline -- src/lib/email.ts supabase/migrations/20260822130000_email_delivery_ledger.sql` e un `npm run build` verde sono la conferma.

---

## Don't Hand-Roll

| Problema | Non costruire | Usa invece | Perche' |
|---|---|---|---|
| Acquisto senza sessione | Un percorso nuovo di checkout | La forma di `purchaseDrinksGuest` (`menu/actions.ts:197-338`) | Prezzo ricalcolato sul server, un uuid per ordine e riferimento, `redirectUrl` con contesto: tre trappole gia' pagate |
| Identita' leggera + link | `generateLink` con `action_link` | `buildPasswordSetLink` (`src/lib/auth/password-set-link.ts`) | Il difetto del flusso implicito con **token bruciato** e' stato misurato in laboratorio il 2026-08-19. Un secondo generatore lo reintrodurrebbe |
| Ritrovamento senza login | Un token nuovo, una tabella di sessioni ospite | `generateTicketToken` / `verifyTicketToken` + la forma di `redeemDrinkTokenGuest` | La firma HMAC esiste, e' verificata in tempo costante, ed e' gia' esercitata su un percorso ospite |
| Piu' unita' da un pagamento | Una colonna `quantity` | `drink_orders` -> RPC -> N `drink_tokens` (`phase9_drinks.sql`) | §3 opzione B: rompe la porta e i rimborsi |
| Emissione atomica | N chiamate dall'applicazione | Una RPC `SECURITY DEFINER` con `FOR UPDATE`, sul modello di `reserve_ticket` (`discount_codes.sql:89-183`) | Sei chiamate sono sei modi di fallire a meta' su un percorso di denaro |
| Sapere se una mail e' arrivata | Un try/catch, o un log | `email_deliveries` + `recordSend` + `reconcileDeliveries` | `ledger.ts:30-33`: *«la risposta d'invio non e' un esito, e' una ricevuta di presa in carico»* |
| Decidere se mostrare il venue | Un'espressione sulla pagina | `venue-disclosure.ts`, importato | *«Due espressioni per una decisione divergono, e qui divergere pubblica un indirizzo»* (`venue-secrecy.md`) |
| Un numero per serata | Una costante di prodotto, o una colonna nullabile con `coalesce` | Una colonna `NOT NULL DEFAULT` con `CHECK` e `COMMENT` | §9: `venue_reveal_hours` e' il contro-esempio con due case per un default |
| Attribuzione | Un valore su `profiles.status` | Una colonna d'evidenza sul biglietto, senza FK, nullabile, senza default | §8; e `status` viene smantellato dalle fasi 50/51 |

---

## Common Pitfalls

### P-1. `profiles` incorporato in una select su `tickets` o `rsvps`
**Cosa va storto:** PostgREST risponde `PGRST200`. **Perche':**
`tickets.user_id` referenzia `auth.users(id)`, non `public.profiles` — nessuna
chiave esterna da seguire. **Costo pagato:** ogni scansione rispondeva `500`
(`checkin/route.ts:915-927`), e la rivelazione del venue **non partiva affatto**
(`reveal-party-venue.ts:352-371`). **Come evitare:** seconda query, a blocchi di
100. **Segnale:** un `500` alla porta, o un cron che riporta zero destinatari.

### P-2. Il default che fabbrica un numero
**Cosa va storto:** una colonna d'attribuzione con `DEFAULT 'qualcosa'` fa
dichiarare a ogni riga futura che ha saltato la scrittura di essere stata quel
qualcosa. **Perche':** una fabbricazione con un autore automatico
(`attendances_entry_role.sql:64-66`). **Come evitare:** nullabile, senza default,
una sola lettura del NULL, scritta nella migration.

### P-3. `maybeSingle()` su una relazione diventata uno-a-molti
**Cosa va storto:** `(public)/events/[slug]/page.tsx:612` restituisce un errore
che **e' scartato**; `userTicket` diventa `null`; la pagina ripropone l'acquisto a
chi ha gia' sei biglietti. **Come evitare:** convertire ogni `maybeSingle()` su
`tickets` filtrato per `user_id`. **Censimento:** `page.tsx:612` e
`admin/events/actions.ts:1450,1463`. **Non verificato** che siano gli unici:
`grep -rn "maybeSingle" src/` prima di allentare qualunque indice.

### P-4. Una categoria di mail aggiunta in un posto solo
**Cosa va storto:** l'unione TS e il `CHECK` divergono; l'invio parte e la
registrazione fallisce; il biglietto risulta «nessun invio registrato».
**Come evitare:** `categories.ts:52-54` — **due modifiche in un commit**.

### P-5. Una terza superficie venue che il gate non conosce
**Cosa va storto:** `verify:venue-surfaces` resta verde mentre la superficie
nuova stampa `venue_text` senza predicato. **Perche':** B e C leggono due
percorsi codificati (`:93-95`). **Come evitare:** estendere lo script nello
stesso commit. **Segnale:** un `git diff` che tocca `venue_text` senza toccare
`scripts/verify-venue-surfaces.mjs`.

### P-6. Un nuovo endpoint pubblico «valido / non valido»
**Cosa va storto:** BUY-04 introduce un percorso che, dato un identificativo,
dice se esiste. `access-gating.md` gate *nessun rate limiting, oggi*: **il repo
non ha alcun rate limiting**, quindi ogni endpoint del genere e' un oracolo
gratuito. **Come evitare:** l'identificativo e' `uuid + HMAC`, non enumerabile —
e il piano deve **dirlo per iscritto**, come quel gate richiede.

### P-7. Un account creato prima del pagamento
**Cosa va storto:** ogni checkout abbandonato lascia un `auth.users` e un
`profiles` con `membership_code` e `status: 'pending'`. **Come evitare:** creare
l'identita' al webhook (§2), oppure dichiarare la pulizia come lavoro esplicito.

### P-8. Fidarsi del corpo del webhook
**Cosa va storto:** chiunque puo' mandare un POST. **Come evitare:** la riga
esiste gia' e non si tocca — `getCheckout(body.id)` (`route.ts:22`), *«ALWAYS
verify via GET checkout API»*.

---

## Environment Availability

| Dipendenza | Richiesta da | Disponibile | Versione | Ripiego |
|---|---|---|---|---|
| `@supabase/supabase-js` (`auth.admin`) | identita' leggera | ✓ | `^2.97.0` (`package.json:51`) | — |
| `resend` | mail + registro | ✓ | `^6.9.2` (`package.json:65`) | — |
| `qrcode` | QR del biglietto | ✓ | `^1.5.4` (`package.json:60`) | — |
| `next` | tutto | ✓ | `16.1.6` (`package.json:56`) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | `createUser`, `generateLink`, tutte le scritture ospite | ✓ presunta su Vercel | — | Nessuno. **Non verificato** in questa sessione (e non verificabile da qui) |
| `TICKET_SIGNING_SECRET` | firma del biglietto | ✓ presente su locale e Vercel (memoria di progetto) | — | Nessuno: senza, ogni QR e' invalido |
| `NEXT_PUBLIC_APP_URL` | link password, `redirectUrl`, URL del biglietto | ✓ | — | `process-entry.ts:263-268` **rifiuta di inventare un dominio** e logga con categoria propria. Precedente registrato: un a-capo in coda ha gia' rotto il webhook |
| **Rate limiting** | ogni endpoint di verifica | ❌ **assente** | — | **Nessuno.** Vincolo dichiarato, non risolvibile in questa fase |
| **Error tracking** | ogni percorso d'errore nuovo | ❌ **assente** | — | Effetto osservabile obbligatorio al posto del log |
| Test runner del prodotto | verifica | ❌ **assente** | — | `npm run build` + procedure manuali scritte |

**Mancanti senza ripiego che il piano deve nominare:** rate limiting ed error
tracking. Entrambi cambiano cosa significa «verificato», e nessuno dei due e'
lavoro di questa fase.

---

## Package Legitimacy Audit

**Questa fase non installa alcun pacchetto esterno.** Tutte le capacita'
richieste — creazione utente lato server, link a token, firma HMAC, QR, invio
mail, registro di consegna — sono coperte da dipendenze **gia' presenti** in
`package.json` ed esercitate in produzione.

| Pacchetto | Registro | Stato | Disposizione |
|---|---|---|---|
| — | — | nessuna nuova dipendenza proposta | **Nessun audit necessario** |

Se un piano proponesse un pacchetto nuovo (per esempio una libreria di validazione
o di rate limiting), **rientrerebbe nel Package Legitimacy Gate** e andrebbe
verificato prima dell'installazione. `checkin/route.ts:111-116` registra gia' la
decisione contraria per la validazione: *«there is no validation library in this
repository and one is not being added for this route alone»*.

---

## Validation Architecture

`.planning/config.json` non contiene la chiave `workflow.nyquist_validation`,
quindi la sezione va inclusa. **Ma il fatto di ambiente domina, e va detto
per primo.**

### Framework di test

| Proprieta' | Valore |
|---|---|
| Framework | **nessuno.** `package.json` non ha script `test` e non esiste alcun `*.test.*` o `*.spec.*` per il prodotto |
| File di configurazione | nessuno |
| Comando rapido | `npm run build` (esegue anche il typecheck: non esiste script `typecheck` separato) |
| Suite completa | `npm run verify` (`scripts/verify-all.mjs`) — **copre gate strutturali, non il comportamento del prodotto** |

**Nessun piano puo' dichiarare un requisito verificato perche' «i test passano».**

### Requisiti -> verifica

| Req | Comportamento | Tipo | Comando automatico | Esiste? |
|---|---|---|---|---|
| BUY-01 | un ordine produce N biglietti scansionabili distinti | manuale | — | ❌ nessun automatismo possibile |
| BUY-01 | nessun `maybeSingle()` residuo su `tickets` per `user_id` | statico | `grep -rn "maybeSingle" src/ \| grep -E "tickets"` | ✅ eseguibile |
| BUY-02 | il tetto e' applicato **server-side**, non solo nella UI | statico + manuale | `grep -n "max_tickets_per_order" supabase/migrations/*.sql` | ✅ per l'esistenza, ❌ per l'applicazione |
| BUY-03 | il percorso ospite non chiama `auth.getUser()` | statico | `grep -n "auth.getUser" <nuovo file>` -> **0** | ✅ |
| BUY-04 | la superficie ospite non reindirizza a `/login` | statico | `grep -n "redirect(\"/login\")" <nuovo file>` -> **0** | ✅ |
| BUY-05 | `generateMembershipCode` non esiste piu' | statico | `grep -rn "generateMembershipCode" src/` -> **0** | ✅ |
| BUY-05 | nessun `Math.random` su un percorso di credenziale | statico | `grep -rn "Math.random" src/utils/ src/lib/` | ✅ |
| venue | il gate conosce la superficie nuova | statico | `npm run verify:venue-surfaces` **dopo** aver esteso lo script | ✅ |
| persona | i gate concordano dopo la cancellazione | statico | `npm run verify:persona` | ✅ |
| tutto | il tipo non mente | compilatore | `npm run build` | ✅ |

### Frequenza

- **Per commit:** `npm run build`.
- **Per onda:** `npm run build` + i grep di cui sopra + `npm run verify:venue-surfaces` sulle onde che toccano una superficie.
- **Cancello di fase:** `npm run verify` verde, **piu' le procedure manuali scritte**, eseguite e riportate in `49-VERIFICATION.md` con evidenza `file:riga`.

### Le procedure manuali che la fase deve produrre

Non sono opzionali: sono l'unica prova che esistera'. `49-CONTEXT.md:205-214`
ne prescrive tre, e la ricerca ne aggiunge due.

1. **Il venue non compare in nessuna superficie del percorso ospite prima della rivelazione** — conferma d'acquisto, schermata del biglietto, mail. Con quale ruolo, con quale stato della serata, e cosa si deve osservare.
2. **Un biglietto d'ospite passa alla porta, anche offline**, e il nome mostrato e' risolvibile. **Includere il caso non in cache** (§8).
3. **Un ordine da piu' biglietti** produce codici distinti, tutti scansionabili, e **la seconda scansione dello stesso codice e' rifiutata**.
4. *(aggiunta)* **Dopo la rivelazione, un ospite che compra e non ha mai scelto una password raggiunge l'indirizzo.** E' il buco di §7, e l'unico modo di sapere che e' chiuso e' percorrerlo.
5. *(aggiunta)* **Un indirizzo mail scritto male non lascia l'ospite senza niente**: la conferma a schermo porta il QR e il link permanente prima che la mail parta (P4).

### Lacune «onda 0»

- Nessun file di test da creare: non esiste framework e **non se ne introduce uno in questa fase**.
- Da creare invece: l'estensione di `scripts/verify-venue-surfaces.mjs` (P3), che e' il solo automatismo nuovo che questa fase deve produrre.

---

## Security Domain

`security_enforcement` non e' presente in `.planning/config.json` — trattato come
abilitato.

### Categorie ASVS applicabili

| Categoria | Si applica | Controllo standard in questo codice |
|---|---|---|
| **V2 Authentication** | **si** | `auth.admin.createUser` senza password + `recovery` link con `hashed_token` scambiato da `verifyOtp` sulla pagina che ha il campo (`password-set-link.ts`). **Nessun percorso in cui un utente modifica il proprio `role` o `status`** — `access-gating.md` gate *escalation privilegi* |
| **V3 Session Management** | **si** | `@supabase/ssr` con cookie; la sessione dell'ospite nasce solo a `/set-password`. La superficie del biglietto d'ospite e' **senza sessione**: la sua credenziale e' la firma, non un cookie |
| **V4 Access Control** | **si** | **RLS, non il middleware** (`CLAUDE.md` principio 2). `tickets_select_own USING (auth.uid() = user_id)` regge invariata. `/tickets` **non e' in `PROTECTED_PREFIXES`** (`next-redirect.ts:137-143`): la superficie ospite non richiede modifiche al middleware, e non deve chiederne |
| **V5 Input Validation** | **si** | **Nessuna libreria, e non se ne aggiunge una** (`checkin/route.ts:111-116`). I controlli sono espliciti: `TICKET_TOKEN_PATTERN`, `UUID_PATTERN`, campi `unknown` nei body. L'indirizzo mail dell'ospite e' input non fidato che raggiunge il client di servizio: normalizzazione + lookup preventivo, sul modello di `process-entry.ts:160-168` |
| **V6 Cryptography** | **si** | HMAC-SHA256 con `crypto.createHmac` e confronto in tempo costante `crypto.timingSafeEqual` (`qr.ts:22-27`). `gen_random_uuid()` per gli identificativi. **Mai a mano** |

### Pattern di minaccia noti per questo stack

| Pattern | STRIDE | Mitigazione |
|---|---|---|
| Corpo del webhook falsificato | Spoofing | `getCheckout(body.id)` — verifica via GET, mai il corpo (`route.ts:22`) |
| Doppia emissione da consegna at-least-once | Tampering | Idempotenza dallo schema (`sumup_checkout_id UNIQUE`), non dal codice — **la ragione per l'opzione C, §3** |
| Enumerazione di un identificativo d'accesso | Information disclosure | `uuid` + firma HMAC. **Rate limiting assente**: dichiarato, non risolto |
| Escalation via client di servizio | Elevation of privilege | `access-gating.md` gate *service role*: giustificazione scritta nel commit, e prova che nessun input non fidato lo raggiunge senza normalizzazione |
| Rivelazione anticipata di un indirizzo | Information disclosure | `venue-disclosure.ts` come unica casa + `verify:venue-surfaces` esteso alla superficie nuova (§7) |
| Furto di un ordine ospite | Spoofing | Non applicabile con identita' vera: non c'e' nessun `user_id NULL` da rivendicare |
| Mancata consegna silenziosa | Repudiation | `email_deliveries` + riconciliazione, **piu'** la conferma a schermo che rende la mail non necessaria (P4) |
| Rifiuto di un ospite valido alla porta | Denial of service (sul cliente) | `checkin-offline.md`: ammettere e' il default; il ripiego e' l'ammissione, mai il rifiuto |

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | La tabella dei tipi di `generateLink` (quali creano un utente, quali ne pretendono uno) e' ricostruita dalla lettura della pagina di riferimento, non citata alla lettera | §4 | Bassa: il codice usa gia' `recovery` con successo, e il suo docblock dichiara la stessa distinzione da una misura in laboratorio |
| A2 | Nessun'altra superficie oltre a quelle censite legge `tickets` con `maybeSingle()` filtrato per `user_id` | §3, P-3 | Media. **Si chiude con `grep -rn "maybeSingle" src/` prima di allentare gli indici** |
| A3 | I punti di lettura di `sumup_checkout_id` su `tickets` sono tre | §3 | Media. **Si chiude con `grep -rn "sumup_checkout_id" src/`** |
| A4 | `SUPABASE_SERVICE_ROLE_KEY` e `TICKET_SIGNING_SECRET` sono configurate su Vercel | Environment | Alta se sbagliata — nessun biglietto sarebbe emesso o firmato. Non verificabile da questa sessione |
| A5 | SumUp non mostra all'acquirente nulla oltre `description` e importo | §7 | Media sul venue. **Si chiude guardando una vera pagina di checkout con dei tier in vendita** — che e' lo stesso momento in cui si prova Apple Pay (voce differita) |
| A6 | Il ramo `!wasCached` di `checkInLocally` ammette invece di rifiutare | §8 | **Alta**: e' l'asimmetria di `checkin-offline.md` sul caso normale di un acquisto del giorno stesso. **Si chiude leggendo `checkin-store.ts:841-960` e `ScannerClient.tsx`** |
| A7 | `public.venue_for_parties` porta gia' un termine di titolarita' per serata | §7 | **Alta** se sbagliata: l'account leggero allarga `authenticated`. **Si chiude leggendo `20260810161000_venues_read_narrowed.sql` per intero** |

---

## Open Questions

1. **La schermata «Completa il tuo account» e' quella condivisa o una variante?**
   - Si sa: `/set-password` esiste, non e' in `PROTECTED_PREFIXES`, ed e'
     condivisa con l'invito admin e con la guest list. Il suo testo oggi e'
     *"Set your password"* / *"Choose a password for your re:sonate account"*
     (`(auth)/set-password/page.tsx:45,51,53`).
   - Non e' chiaro: la decisione 5 vincola il testo per l'ospite. Cambiare il
     testo condiviso cambia anche cio' che leggono le persone invitate a mano.
   - Raccomandazione: **una variante per contesto sulla stessa pagina**, non una
     seconda pagina. Due pagine che scambiano un token per una sessione sono due
     percorsi d'autenticazione, e il difetto del 2026-08-19 e' costato caro
     proprio li'.

2. **BUY-04: firma-sola o firma + mail?**
   - Si sa: il precedente drink e' firma-sola.
   - Non e' chiaro: se il proprietario vuole la seconda prova, e' una scelta di
     dominio (una credenziale piu' stretta contro un ospite in piu' che rientra),
     non tecnica.
   - Raccomandazione: **firma-sola**, coerente con il precedente, **piu'** il
     percorso «rimandami il biglietto a questo indirizzo» come seconda strada.
     Chiedere la mail per *vedere* un biglietto che si ha gia' in mano aggiunge
     un attrito senza aggiungere sicurezza: chi ha il link ha gia' la credenziale.

3. **Cosa succede a un ospite che perde il link e non ha mai scelto una
   password?** Con firma-sola e nessuna mail arrivata, non ha niente.
   **Raccomandazione:** un percorso «rimandami il biglietto», che e' un endpoint
   di verifica — quindi ricade in P-6 e va dichiarato esposto.

4. **L'etichetta del titolare deriva dall'indirizzo mail?** Domanda di PII (§8c),
   da porre al proprietario, non da decidere nel piano.

5. **`(public)/events/[slug]/page.tsx` e' 87 KB, un file solo.** Non e' un
   problema di questa fase, ma le modifiche di §3 e §7 lo toccano. **Non
   verificato** se esiste gia' un debito registrato per spezzarlo.

---

## Sources

### Primarie — codice e migration di questo albero (confidenza HIGH)

Ogni citazione `file:riga` in questo documento e' stata letta in questa sessione,
2026-09-05, su `main` a `5f1e260`. In particolare:

`src/utils/qr.ts` · `src/lib/email.ts` · `src/lib/email-delivery/{categories,ledger}.ts` ·
`src/lib/auth/password-set-link.ts` · `src/lib/guest-list/process-entry.ts` ·
`src/lib/venue-reveal/{venue-disclosure,reveal-party-venue}.ts` ·
`src/lib/offline/checkin-store.ts` · `src/lib/supabase/{service,middleware}.ts` ·
`src/lib/routes/next-redirect.ts` · `src/app/(public)/events/[slug]/{page,actions,TierSelection}.tsx` ·
`src/app/(public)/events/[slug]/menu/actions.ts` · `src/app/(public)/tickets/[id]/page.tsx` ·
`src/app/(admin)/admin/events/actions.ts` · `src/app/api/webhooks/sumup/route.ts` ·
`src/app/api/tickets/{checkin,attendance,[id]/wallet}/route.ts` ·
`src/app/api/cron/venue-reveal/route.ts` · `src/middleware.ts` ·
`scripts/verify-venue-surfaces.mjs` · `package.json` · `vercel.json`

Migration: `20260225110000_phase6_ticketing` · `20260225150000_party_architecture` ·
`20260226300000_multi_sub_events` · `20260227200000_ticket_refunds` ·
`20260306000000_phase9_drinks` · `20260310000000_guest_list` ·
`20260310100000_discount_codes` · `20260305200000_venue_reveal_on_purchase` ·
`20260808003000_attendances_entry_role` · `20260820110000_drink_refund_requests` ·
`20260822130000_email_delivery_ledger`

### Secondarie — documentazione esterna (confidenza MEDIUM)

- `supabase.com/docs/reference/javascript/auth-admin-createuser` — `password` opzionale, `email_confirm`, avvertimento `service_role`
- `supabase.com/docs/reference/javascript/auth-admin-generatelink` — tipi supportati, `hashed_token`, `service_role`
- `resend.com/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list` — comportamento della lista di soppressione. **Letto da risultati di ricerca**: `firecrawl` ha risposto `Request failed` su questa origine, e `/dashboard/emails/suppression-list` restituisce 404

### Documenti di progetto — usati come input, **non** come fonte di fatti sul codice

`49-CONTEXT.md` · `.planning/todos/pending/guest-ticket-purchase.md` ·
`.planning/ROADMAP.md` § Phase 49 · `.planning/STATE.md` · `./CLAUDE.md` ·
`.claude/rules/{ticketing-payments,access-gating,venue-secrecy,checkin-offline,comms-analytics,supabase-data,meta-gates}.md`

**Quattro loro affermazioni sono contraddette dal codice e sono elencate in §0.**

---

## Metadata

**Confidenza per area:**

| Area | Livello | Ragione |
|---|---|---|
| I percorsi esistenti (§1, §2) | **HIGH** | Letti per intero, con i numeri di riga |
| Vincoli di schema (§3) | **HIGH** | Tracciati attraverso tutte le migration che li toccano, `DROP` compresi |
| Identita' leggera (§4) | **HIGH** sul codice, **MEDIUM** sull'API esterna | Il codice e' letto e ha un difetto gia' misurato alle spalle; la documentazione e' letta oggi ma una delle due pagine e' generata |
| BUY-05 (§5) | **HIGH** | Il file e' 52 righe, il grep degli importatori e' globale ed esaustivo |
| Posta (§6) | **HIGH** sul codice, **MEDIUM** sulla fonte Resend | La pagina canonica non e' stata scaricabile; il contenuto e' confermato da due direzioni indipendenti (ricerca + il codice del prodotto, che cita la stessa fonte con una data) |
| Venue (§7) | **HIGH** sui percorsi, **MEDIUM** sul confine DB | A7 resta aperta |
| Porta (§8) | **HIGH** sul percorso online e sul nome, **MEDIUM** sull'offline | A6 resta aperta |
| Tetto (§9) | **HIGH** | Precedente esatto e recente |
| Ordinamento (§10) | **HIGH** | Deriva dalle sezioni sopra |

**Data della ricerca:** 2026-09-05
**Valida fino a:** ~30 giorni per la parte esterna. **Per la parte interna: fino
al prossimo commit che tocca uno dei file citati.** Questo documento e' stato
scritto perche' quattro documenti precedenti erano scaduti in questo modo — e la
lezione e' quella che `production-calendar.md` scrive di se stesso: *rileggi dalla
fonte, non ricordare*.

---

*Phase: 49-comprare-senza-account*
