---
task: quick 2026-10-05 — codice a 0 € con benefit mostrato alla porta
branch: hotfix/codice-chupito
classification: Critical (porta, online e offline) + Structured (admin, compratore)
requirements: nessun ID di requisito — richiesta diretta del proprietario del 2026-10-05
completed: 2026-10-05
---

# Quick 2026-10-05 — codice sconto a 0 € che porta un benefit alla porta

**In una riga:** un codice sconto puo' valere 0 € e portare un benefit breve
(«1 chupito»); chi organizza lo crea dall'admin, il compratore legge «Code
applied: 1 chupito» a prezzo pieno, e lo scanner stampa «+ 1 chupito» sotto il
tipo di biglietto — online, offline, su *Already recorded*, sugli annullamenti e
come badge nella lista della serata. Il prezzo non cambia in nessun punto.

## Cosa e' cambiato

| Dove | Cosa |
|---|---|
| `supabase/migrations/20261005120000_discount_code_benefit.sql:21-36` | `discount_amount >= 0` (il vecchio vincolo si toglie SENZA `IF EXISTS`: se il nome fosse diverso la migration fallisce invece di lasciare il `> 0`); colonna `benefit text` 1..60 dopo trim; `CHECK (discount_amount > 0 OR benefit IS NOT NULL)`; `COMMENT ON COLUMN` (:38-43). RLS invariata. Nessun `BEGIN;`. |
| `src/types/database.ts:469-470` | `DiscountCode.benefit: string \| null` |
| `src/app/(admin)/admin/events/[id]/tickets/actions.ts:389-398` | `parseBenefit`: trim, max 60, «A 0 code needs a benefit shown at the door» |
| idem `:426-430`, `:526-530` | create/update rifiutano `< 0` (non piu' `<= 0`) e salvano `benefit` (`:468`, `:566`) |
| idem `:665`, `:673`, `:713` | `validateDiscountCode` restituisce il benefit |
| `src/components/tickets/AddDiscountCodeForm.tsx:62-71`, `DiscountCodeCard.tsx:93-98` | stessa regola ripetuta lato client: in produzione Next **omette il messaggio** di un'eccezione lanciata da una server action, quindi senza questo controllo il rifiuto arriverebbe generico |
| `AddDiscountCodeForm.tsx` (campo `benefit`, `min={0}`), `DiscountCodeCard.tsx:202-217`, `:315-319` | campo «Benefit shown at the door (e.g. 1 chupito)», max 60; la card mostra «+ benefit» e lo modifica |
| `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx:251` | passa `benefit` alla card |
| `src/app/(public)/events/[slug]/TierSelection.tsx:668-675` | a 0 con benefit: «Code applied: <benefit>»; con importo > 0: «Discount applied: 10% + <benefit>» |
| idem `:607` | il prezzo barrato compare solo se il prezzo scende davvero: con un codice a 0 niente «10,00 €» barrato accanto a «10,00 €» |
| `src/app/api/tickets/checkin/route.ts:791`, `:1009-1037`, `:1085`, `:1144`, `:161-166` | `discount_code_id` nella lettura del biglietto; **lettura separata e non bloccante** di `discount_codes.benefit` (`checkin:benefit_unreadable`); `benefit` nella risposta dei due rami che ammettono |
| `src/app/api/tickets/attendance/route.ts:294-301`, `:888-915`, `:937-940` | `AttendeeItem.benefit` nel manifesto; lettura che non fa mai fallire il manifesto (`[attendance] benefit read failed`); `null` per guest list e rimborsati |
| `src/lib/offline/checkin-store.ts:188-197`, `:814-815`, `:975-982` | `AttendeeRecord.benefit` opzionale; il merge prende il valore del server quando il campo c'e', tiene quello del telefono quando un manifesto vecchio non lo porta |
| `src/components/scanner/ScanFlash.tsx:47-54`, `:220-226` | riga «+ <benefit>» sotto il sottotitolo, `text-xl font-bold`, stesso inchiostro `text-ground`; il titolo non cambia (D-51-05, niente nome) |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | `showFlash(…, benefit)` `:1797-1812`; Admitted online `:2282-2308`; Already recorded online `:2342-2348`; Already recorded offline `:2413-2424`; Admitted offline `:2492-2504`; i due annullamenti `:2000`, `:2052`; badge nella lista `:4051-4055` |

Il percorso del denaro **non e' stato toccato**: `order-quote.ts:613-619`,
`purchaseTicket` (`admin/events/actions.ts:1933-1945`) e
`guest-purchase-actions.ts:365` non hanno alcun controllo di verita'
sull'importo (`if (!amount)`, `amount && …`): un codice a 0 passa la
validazione, lascia il prezzo identico e scrive `discount_code_id` come prima.
Il minimo di 1,00 € non e' coinvolto, perche' il prezzo non scende.

## Prova sul laboratorio (ore UTC)

Dev server `npm run dev:lab -- --webpack` nel worktree (Turbopack rifiuta il
`node_modules` simbolico), Chrome headless con profilo isolato e **camera
finta** che inquadra il QR firmato del biglietto seminato: la scansione e' una
lettura vera di `html5-qrcode`, non una chiamata all'API. Schermate in
`~/Documents/Resonate/hotfix-benefit/`, fuori dal repo.

| UTC | Passo | Ruolo | Osservato | Schermata |
|---|---|---|---|---|
| 19:18:15 | migration applicata con UNA `POST /database/migrations` | — | `200 []` | — |
| 19:18:23 | catalogo, `read_only` | — | colonna `benefit text NULL`; vincoli `discount_amount >= 0`, `benefit_length_check`, `zero_needs_benefit_check`; registro migration con il nome del file | — |
| 19:27:16 | preparazione | — | originali salvati; serata e evento spostati a oggi (lo scanner elenca solo da ieri in poi); biglietto seminato tolto dal check-in | — |
| 19:29:12 | codice a 0 senza benefit dal form | master | «A 0 code needs a benefit shown at the door» | `01-admin-refusal-0-without-benefit.png` |
| 19:29:16 | codice `CHUPITO-LAB`, 0, «1 chupito» dal form | master | card: «+ 1 chupito», «0%», «0 used» | `02-admin-code-created.png` |
| 19:29:28 | stesso caso scritto con la chiave di servizio (scavalca form e azione) | — | `23514` — il catalogo rifiuta | — |
| 19:29:28 | codice agganciato al biglietto seminato (scrittura solo-lab) | — | `discount_code_id` valorizzato, `checked_in = false` | — |
| 19:30:25 | scansione ONLINE | staff (`door.operate`) | **Admitted / Lab / + 1 chupito** | `03-online-admitted.png` |
| 19:30:26 | lista della serata | staff | badge «+ 1 chupito» | `04-night-list-badge.png` |
| 19:30:33 | seconda scansione online | staff | Already recorded / Recorded at 21:30 / + 1 chupito | `05-online-already-recorded.png` |
| 19:30:35 | annullamento online | staff | rifiutato: «needs a supervisor» (regola esistente, invariata) | `06-online-undo.png` |
| 19:32:54 | camera aperta online, rete tolta via CDP (`navigator.onLine = false`), scansione OFFLINE | staff | **Admitted / Lab · Offline / + 1 chupito** | `07-offline-admitted.png` |
| 19:32:55 | annullamento offline | staff | rifiutato: «needs a supervisor» (atteso) | `08-offline-undo-staff.png` |
| 19:33:04 | rete restituita | staff | la coda si svuota: il server ha il check-in | — |
| 19:33:30 | scansione online | master | Admitted / Lab / + 1 chupito | `09-master-online-admitted.png` |
| 19:33:32 | annullamento online | master | **Check-in undone / Lab / + 1 chupito**; server `checked_in = false` | `10-online-undo.png` |
| 19:33:46 | scansione offline | master | Admitted / Lab · Offline / + 1 chupito | `11-master-offline-admitted.png` |
| 19:33:48 | annullamento offline | master | **Undone on this device / Lab — held here, not yet reported / + 1 chupito**; al ritorno della rete il server resta `false` (l'annullato non si riporta) | `12-offline-undo.png` |
| 19:34:22 | pagina pubblica, ospite senza sessione, prezzo del livello portato a 10 € per la prova | — | **«Code applied: 1 chupito»**, prezzo «10,00 €» non barrato, nessun «0,00 €» nella pagina; fermato prima del pagamento | `13-buyer-code-applied.png` |
| 19:34:23 | prezzo del livello rimesso a 0 | — | `price = 0` riletto | — |
| 19:34:41 | **ripristino e riconteggio da PostgREST** | — | biglietto: `checked_in`, istante, operatore e `discount_code_id = null` identici agli originali; serata ed evento di nuovo al 2026-09-28; livello a 0; codici sulla serata: 0 | — |

**Ripristinato**, riletto il 2026-10-05 alle 19:34:41 UTC. **Resta** nel lab,
per costruzione: **5 righe di `door_scan_events`** sul biglietto seminato
(`recorded/online`, `already_recorded/online`, `recorded/offline_sync`,
`recorded/online`, `recorded(undo)/online`) — sono il registro della porta, che
si appende e non si cancella.

## Passi di produzione (per l'orchestratore, dopo il «vai»)

1. **Migration**: UNA `POST /v1/projects/{ref-produzione}/database/migrations`
   con `name = 20261005120000_discount_code_benefit` e il testo del file.
   Applicarla **prima** del deploy non rompe nulla: il codice corrente non legge
   `benefit`. Il deploy prima della migration non rompe la porta (la lettura del
   benefit e' separata e non bloccante) ma il form admin fallirebbe all'insert.
2. **Lettura del catalogo `read_only`**: colonna `benefit` presente;
   `pg_get_constraintdef` di `discount_codes_discount_amount_check` = `>= 0`;
   presenti `discount_codes_benefit_length_check` e
   `discount_codes_zero_needs_benefit_check`; registro migration con quel nome.
3. **Push** del ramo `hotfix/codice-chupito` su `main` (3 commit di codice + 1
   di documentazione), deploy Vercel, controllo che il deploy sia `READY`.
4. **Creare il codice** dall'admin della serata: importo 0, benefit «1 chupito».
5. **Lo staff riscarica il manifesto** sui telefoni (riapre la serata con la rete)
   prima di aprire la porta: un manifesto scaricato prima del deploy non porta il
   campo e la riga offline non compare finche' non si riscarica.

## Limiti dichiarati

- **Il benefit si legge dal codice, non dal biglietto.** Un codice con vendite
  si **disattiva**, non si cancella: cancellarlo mette a `NULL`
  `tickets.discount_code_id` (`ON DELETE SET NULL`) e il benefit sparisce dalla
  porta. Oggi la cancellazione e' gia' vietata con vendite
  (`deleteDiscountCode`, «Cannot delete a discount code that has been used»).
  Modificare il testo del benefit cambia cio' che la porta mostra per **tutti**
  i biglietti gia' venduti con quel codice.
- **Offline senza manifesto** (biglietto comprato dopo il download): ammesso e
  segnalato come sempre, **senza** la riga del benefit — il telefono non puo'
  saperlo.
- **Nessun «consumato».** La riga ricompare a ogni scansione, anche su *Already
  recorded*: segnare un chupito come gia' dato non e' in questo task. Se il
  doppio omaggio diventa un problema, e' una decisione di prodotto.
- **Sales dashboard**: il codice compare con «0,00 €» come importo dello sconto
  (vero, e solo admin); non mostra il benefit.
- **La prova d'acquisto si ferma prima del pagamento.** Che `discount_code_id`
  venga scritto su un ordine a 0 di sconto e' provato leggendo il codice
  (`order-quote.ts:619`, nessun ramo sull'importo), non con un incasso.
- **Render headless**, non un telefono: le schermate provano testo e gerarchia,
  non i touch target.

## Deviazioni dal piano

**1. [Rule 1 - Bug, sicurezza della porta] Nessun salto di versione IndexedDB.**
Il piano chiedeva di alzare `DB_VERSION`. Il pattern del file per un campo
opzionale e' **non** alzarla: `refundedBeforeNight` (52.2-11) e' entrato cosi',
e `DB_VERSION` e' ancora 6. IndexedDB salva un clone strutturato, quindi una
riga senza `benefit` si carica invariata (nessuna riga rifiutata). Un salto
invece aggiunge un `versionchange` e `openDB` non gestisce `blocked`: una
seconda scheda col bundle vecchio aperta sul telefono lascerebbe il database
**in attesa** — alla porta. Motivo scritto accanto al campo
(`checkin-store.ts:188-197`).

**2. [Rule 2 - Correttezza] Il benefit alla porta e' una lettura separata**, non
un embed nella lettura del biglietto: un embed che fallisce (deploy prima della
migration, cache di schema non ricaricata) farebbe fallire tutta la lettura e
rifiuterebbe ogni ospite. Stesso principio nel manifesto.

**3. [Rule 2 - Errori visibili] Controllo lato client nei due form**, perche' in
produzione il messaggio della server action non arriva al browser.

**4. [Rule 1 - Bug] Prezzo barrato uguale al prezzo pieno** con un codice a 0:
corretto con `< tier.price` (`TierSelection.tsx:607`).

## Verifica

`npm run build` exit 0 (dopo il task 2 e dopo il task 3);
`verify:scan-legibility`, `verify:touch-targets`, `verify:dialogs`,
`verify:no-viewport-read`, `verify:breakpoints`, `verify:routes`,
`verify:capabilities` exit 0. Nessun test runner per il prodotto: la prova e' la
tabella qui sopra.

## Commit

- `a040eb9c` feat(quick-benefit): codice sconto a 0 € con benefit — migration e tipi
- `3bd26c9c` feat(quick-benefit): codice a 0 € con benefit — admin e compratore
- `5cc99672` feat(quick-benefit): la porta mostra il benefit del codice, online e offline

---

## Chiusura di default −2h (seconda richiesta, 2026-10-05)

**Richiesta del proprietario:** «tiers e codici su cui non e' stata scelta una
scadenza, possono essere acquistati/utilizzati fino a 2h prima della fine
dell'evento?» — piu' tre aggiunte dello stesso giorno: un tier o codice scaduto
**non sparisce**, resta disabilitato con «Expired»; un tier o codice con tetto
pieno resta disabilitato con «Sold out» (solo se il tetto c'e'); quando valgono
entrambe **vince «Sold out»** («quando un tier e' sia sold out che expired deve
mostrare sold out»).

**La regola, in un posto solo:** `src/lib/tickets/sales-window.ts`.

- `defaultSalesCloseAt(party)` = `partyEndInstant(date, end_time)` − 2 h, in
  `Europe/Rome` con l'ora legale risolta da `src/utils/datetime.ts`. `null` se
  `end_time` e' nullo.
- `tierClosesAt(tier, party)` = `expires_at` esplicito se c'e' (rispettato come
  scritto, anche se dopo il default), altrimenti il default.
- `isTierOnSale`, `isTierClosedByDefault`, `isCodeUsable`; risposte
  `CODE_SALES_CLOSED_MESSAGE = "Expired"`, `CODE_SOLD_OUT_MESSAGE = "Sold out"`.
- La regola chiude soltanto: `starts_at`, quantita', `is_active`, `max_uses`
  restano dove erano.

| Dove decide | File:riga | Cosa |
|---|---|---|
| Preventivo (ospite, RSVP gratuito, ripresa ordine) | `src/lib/tickets/order-quote.ts:573`, `:645` | `tier_sales_closed`; `quote_discount_sales_closed` → «Expired»; `quote_discount_exhausted` → «Sold out». Il controllo del tier sta FUORI dal blocco di stato che si apre su lettura fallita, e DOPO di esso (sold out prima) |
| Acquisto con sessione | `src/app/(admin)/admin/events/actions.ts:1840`, `:1955`, `:1960` | stesse cause, stesso ordine |
| Anteprima del codice | `src/app/(admin)/admin/events/[id]/tickets/actions.ts:708`, `:728` | «Sold out» poi «Expired» |
| Pagina della serata | `src/app/(public)/events/[slug]/page.tsx:705` | ai tier va la chiusura EFFETTIVA + `closes_by_default` |
| Pagina — `isUpcoming` | `src/app/(public)/events/[slug]/page.tsx:1104` | fine serata in istanti di Torino (prima: data UTC, spegneva l'elenco alle 02:00 di una notte in corso) |
| Stato del tier | `src/lib/tickets/tier-status.ts:87` | ordine coming_soon → sold_out → expired, documentato |
| Riga del tier | `src/app/(public)/events/[slug]/TierSelection.tsx:570`, `:414` | `aria-disabled` sui tier non in vendita; «Offer ends in» solo per una scadenza scelta |
| Ripresa ordine | `src/app/(public)/tickets/order/[token]/resume-actions.ts` | le due cause nuove mappate (il build lo pretendeva) |

### Prova

**Helper (tsx, istanti stampati):**

| Serata | Chiusura di default |
|---|---|
| 22:00→06:00 di sab 10/10 | `2026-10-11T02:00Z` = **04:00 di dom 11/10** a Torino |
| 18:00→22:00 di gio 15/10 | `2026-10-15T18:00Z` = **20:00** |
| 22:00→06:00 di sab 24/10 (cambio d'ora) | `2026-10-25T03:00Z` = **04:00 CET**, due ore vere prima delle 06:00 CET |
| senza `end_time` | `null` |

Notte del 10/10: alle 23:00 di Torino tier e codice in vendita; alle 04:00
dell'11/10 no. Una scadenza esplicita alle 05:00 tiene il tier aperto alle 04:30.

**Laboratorio** (`mgkkbdlifgrpmjdtpoax`, ore UTC, schermate in
`~/Documents/Resonate/hotfix-benefit/`). Scritture solo-lab su `Lab Night`:
originali salvati prima, due tier e due codici aggiunti, il tier `Lab` a 10 € e
quantita' 1 (il biglietto seminato lo esaurisce), il biglietto seminato legato a
`FULL-LAB` (max_uses 1).

| UTC | Situazione | Osservato | Schermata |
|---|---|---|---|
| 20:23:20 | serata al 12/10 22→06 | `Lab` «Sold out» disabilitato (`aria-disabled`); `LAB Open`, `LAB Explicit` «Available»; nessun «Offer ends» | `20-A-on-sale-tiers.png` |
| 20:23:27 | codice `CLOSE-LAB` | «Discount applied: 10%» | `21-A-code-usable.png` |
| 20:23:40 | codice `FULL-LAB` (1 uso su 1) | **«Sold out»** sotto il campo | `22-A-code-sold-out.png` |
| 20:24:03 | serata al 05/10 20:00→23:59 (chiusura 21:59 Torino, ora 22:24); `LAB Explicit` con `expires_at` a +3 h | `Lab` **«Sold out»** (esaurito E chiuso), `LAB Open` **«Expired»** disabilitato, `LAB Explicit` «Available» con «Offer ends in 2h 59m» — l'esplicito vince; nessuna riga sparita | `23-B-expired-tiers.png` |
| 20:24:10 | `CLOSE-LAB` dopo la chiusura | **«Expired»** | `24-B-code-expired.png` |
| 20:24:23 | `FULL-LAB` esaurito E dopo la chiusura | **«Sold out»** | `25-B-code-sold-out-and-closed.png` |
| 20:25:08 | `buildOrderQuote` contro il lab | `LAB Open` → `tier_sales_closed`; `LAB Explicit` → OK 14 €; `+CLOSE-LAB` → `quote_discount_sales_closed` «Expired»; `+FULL-LAB` → `quote_discount_exhausted` «Sold out»; `Lab` → `quote_tier_sold_out` | — |
| 20:25:18 | **ripristino e riconteggio da PostgREST** | serata 2026-09-28 22:00→06:00, un tier `Lab` 0 € q 10 senza scadenza, 0 codici, biglietto con `discount_code_id = null` — identici agli originali | `26-restored.png` |

`npm run build` e `verify:conversion`, `verify:routes`, `verify:touch-targets`,
`verify:breakpoints`, `verify:no-viewport-read`, `verify:venue-surfaces`: verdi.

### Deviazioni

**1. [Rule 1 - Bug] «Sold out» del codice non arrivava mai a un ospite.**
`validateDiscountCode` contava gli usi con il client di chi compra: la RLS
nasconde i biglietti altrui, il conto era sempre 0 e `FULL-LAB` rispondeva
«applicato» (visto sul lab). Ora il conteggio (`count` in testa, nessuna riga)
passa dalla chiave di servizio, come gia' fa il preventivo. Commit `ec6cd537`.

**2. [Rule 1 - Bug] «Offer ends in» sulla chiusura di default.** Dare ai tier la
chiusura effettiva faceva partire il countdown su ogni serata («Offer ends in
7d 5h»), una promessa di prezzo che nessuno ha fatto. `closes_by_default` lo
limita alle scadenze scelte. Commit `ec6cd537`.

**3. Regola della mezzanotte:** la consegna chiedeva «`end_time <= time` →
giorno dopo». Si usa `partyEndInstant` («fine prima di mezzogiorno → giorno
dopo»), la regola gia' unica in `datetime.ts` e gemella della funzione SQL
`party_end_instant`. Sui due casi reali (22→06, 18→22) danno la stessa
risposta; una settima variante sarebbe la deriva che quel modulo impedisce.

### Limiti

- **Serata senza `end_time` → nessuna chiusura di default**: vende come prima,
  fino a scadenza o esaurimento.
- **La chiusura e' applicativa**: la RPC `reserve_ticket_order` controlla
  capienza e usi, non l'orario. Un checkout aperto alle 03:59 e pagato alle
  04:01 viene emesso (come gia' per `expires_at`).
- **L'elenco dei tier resta visibile fino a fine serata** (non a fine − 2 h),
  tutto disabilitato; dopo la fine la serata e' passata e l'elenco non si
  disegna (comportamento di prima, ora in istanti di Torino e non per data UTC).
  Il modulo RSVP gratuito resta visibile fino a fine serata e dopo −2 h riceve
  il rifiuto del preventivo.
- **Le frasi dei rifiuti** (`Expired`, `Sold out`, `Invalid code`) arrivano
  come messaggi di errore di una Server Action: comportamento ereditato, non
  provato qui su un build di produzione.
- La card del codice in admin non mostra «Sold out» (facoltativo, non fatto).

### Commit

- `1c46ac45` feat(quick-benefit): chiusura di default a fine serata −2h per tier e codici senza scadenza
- `ec6cd537` fix(quick-benefit): «Sold out» del codice anche per l'ospite, niente «Offer ends» sulla chiusura di default

## Autorizzazione all'atto in produzione

- **Concessa dal proprietario il 2026-10-05**, in chat, alla lettera: *«se nel lab funziona, procedi a migration e deploy in prod. per ora la pagina musica invece è da rivedere quindi non pusharla ancora»*.
- **Condizione**: la prova sul laboratorio e' passata (sezioni sopra). **Perimetro**: una sola migration (`20261005120000_discount_code_benefit`) dalla Management API, merge fast-forward di `hotfix/codice-chupito` su `main`, push, deploy. **Esclusa**: la pagina Music (`wip/52.3`), che resta sul laboratorio.
- **Registrata dall'orchestratore alle 2026-10-05T20:43:15Z**; l'atto si consuma una volta e si chiude con la riga di esito sotto.

**Esito dell'atto (orchestratore):** migration applicata in produzione alle 20:43:55Z (http 200) e riletta alle 20:43:56Z — colonna `benefit`, `discount_amount >= 0`, i due vincoli nuovi, riga `20261005204356:20261005120000_discount_code_benefit` nel registro; `main` portato a `83d1cec9` e spinto alle 20:49:02Z; deploy Vercel **completato** (stato del commit su GitHub: success); `/events/club-house` 200 sulla build nuova; `/music` 404 in produzione (la pagina Music resta sul laboratorio, come chiesto). **Atto consumato.** Restano al proprietario: creare il codice dall'admin della 003 (importo 0, benefit «1 chupito»); allo staff: riaprire la serata con la rete prima della porta.
---

## Terzo intervento — il rifiuto del codice si legge anche in produzione

**Difetto.** `validateDiscountCode` segnalava i rifiuti con `throw new Error(...)`.
In una build di produzione Next toglie il messaggio agli errori lanciati da una
server action: chi compra leggeva «An error occurred in the Server Components
render…» per «Invalid code», «Code is no longer active», «Sold out» ed
«Expired» allo stesso modo — quattro rifiuti resi uno (`meta-gates.md`, zero
fallimenti silenziosi). In `next dev` il messaggio passava, per questo le prove
precedenti (dev server) non lo vedevano.

**Correzione** (commit `a6359db2`):

| File:riga | Cosa |
|---|---|
| `src/app/(admin)/admin/events/[id]/tickets/actions.ts:671-681` | tipo `ValidateDiscountCodeResult` = `{ ok: true, ...anteprima } \| { ok: false, reason: "invalid" \| "inactive" \| "sold_out" \| "expired", message }` |
| idem `:706`, `:710`, `:735`, `:756` | i quattro rifiuti si restituiscono con le frasi di prima, invariate |
| idem `:697-704` | `.maybeSingle()`: «nessuna riga» = `invalid`; un errore della lettura NON e' piu' «Invalid code» ma `[discount.validate_failed] stage=lookup` e throw |
| idem `:765-771` | la lettura dei tier del codice, prima ignorata (un errore dava `null` = «vale su tutti i tier» e un prezzo scontato sbagliato in anteprima), ora `[discount.validate_failed] stage=tiers` e throw |
| `src/app/(public)/events/[slug]/TierSelection.tsx:431-445` | `result.ok` → anteprima; altrimenti `result.message` nello stesso slot `role="alert"`; il catch copre solo il guasto: «Could not check the code. Try again.» + `[discount.validate_unreachable]` in console |

Nessun altro chiamante (`grep validateDiscountCode src`: solo `TierSelection.tsx`).
Il rifiuto «tier non applicabile» non esiste nell'azione: l'applicabilita' la
decide la pagina con `applicable_tier_ids` (prezzo barrato solo sui tier
ammessi), quindi nessuna frase da preservare.

**Prova sul laboratorio con build di PRODUZIONE** (ore UTC, 2026-10-05).
`next build --webpack` con `.env.local` + `.env.lab.local` caricati e il rifiuto
del ref di produzione come prima istruzione (stessa ricetta di
`scripts/dev-lab.sh`); controllato il bundle: 9 file in `.next/static` con il
ref del lab, 0 con quello di produzione. `next start -p 3471`, Chrome headless
375×812 via CDP.

| UTC | Pagina | Azione | Osservato | Schermata |
|---|---|---|---|---|
| 21:25:38 | `/events/lab-secret-night` (Lab Secret Night, 1 € in vendita) | codice `WRONG-CODE-XYZ` → Apply | **«Invalid code»** esatto, nello slot `role="alert"` sotto il campo | `~/Documents/Resonate/hotfix-benefit/prod-build-01-invalid-code.png` |

**Cosa non si e' potuto leggere.** Il lab ha **zero** `discount_codes` (letto
via PostgREST alle 21:24 UTC): le fixture della prova precedente (`CLOSE-LAB`,
`FULL-LAB`) sono state ripristinate alle 20:25:18. Secondo la consegna non si
sono scritte righe nuove, quindi **«Code applied: …», «Sold out», «Expired» e
«Code is no longer active» non sono stati osservati sulla build di
produzione**: passano per lo stesso ramo `ok: false` → `result.message` di
«Invalid code», ma restano non visti. Fermato prima di ogni acquisto. Dopo la
prova server e Chrome spenti, e `.next` ricostruito con l'ambiente normale
(0 file col ref del lab).

`npm run build`, `verify:conversion`, `verify:routes`, `verify:touch-targets`:
verdi.

**Lo stesso schema `throw` → `err.message` a chi compra esiste altrove** (grep
in `src/app/(public)/**`, NON corretti qui). In produzione ognuno di questi
mostra il testo generico di Next al posto del rifiuto:

- `src/app/(public)/events/[slug]/TierSelection.tsx:528` — **acquisto del
  biglietto** (`purchaseTicket`): e' lo stesso flusso del codice, e un codice
  esaurito o scaduto fra l'anteprima e il pagamento verrebbe rifiutato li' con
  il messaggio perso. Il piu' vicino a questo intervento.
- `src/app/(public)/events/[slug]/PendingIntentHandler.tsx:114`
- `src/app/(public)/events/[slug]/DrinkMenu.tsx:59`
- `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx:225`
- `src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx:142`, `:170`, `:185`
- `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:461`, `:489`, `:504`

Da verificare uno per uno se l'azione chiamata lancia davvero rifiuti attesi
(alcune azioni del menu restituiscono gia' un valore: `menu/actions.ts:16-32`).

**Secondo atto (solo codice), autorizzato dal proprietario il 2026-10-05 alla lettera: «comit e push in prod».** Perimetro: push di `main` con la correzione dei messaggi di rifiuto del codice; nessuna migration. Registrato alle 2026-10-05T21:29:46Z.
