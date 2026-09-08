---
phase: 49-comprare-senza-account
milestone: v1.6
verified: 2026-09-08
status: gaps_found
requirements_total: 5
requirements_closed: 4
requirements_partial: 1
requirements_contradicted: 0
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`) + produzione in sola lettura
evidence: 49-ESITI.md (46 prove su 52), 49-AUTHORISATION.md (due autorizzazioni, entrambe esaurite)
---

# Fase 49 — Verifica

> **Cosa significa `gaps_found` qui.** Quattro requisiti su cinque sono chiusi da
> **prove eseguite** sul laboratorio, con cinque pagamenti veri del proprietario
> (10,00 €) e la porta esercitata su iPhone in modalita' aereo. Il quinto,
> `BUY-04`, e' chiuso a meta': i biglietti si ritrovano senza login **dal link**,
> ma la seconda strada che il requisito nomina — *dalla mail* — esiste nel codice
> e **non ha una superficie**. Non e' un `human_needed`: e' un buco misurato.
>
> Non esiste un test runner per il prodotto. `npm run build` e' il typecheck, non
> una prova di comportamento. Ogni riga qui sotto cita **dove sta** la cosa e
> **cosa si e' osservato** percorrendola, con la sigla della prova in
> `49-ESITI.md`.

## Il goal, in una riga, e se e' stato osservato

*Una persona che non ci conosce vede una serata, compra fino a sei biglietti con
il solo indirizzo mail, li ritrova senza login, e li fa passare alla porta —
anche con la radio spenta.*

**Osservato per intero il 2026-09-08**, in questa sequenza: acquisto senza
sessione (`P-UI-1`, `P-BUY-1`), sei biglietti da un ordine (`P-WH-1` N=6,
`P-UI-4`), link firmato aperto senza sessione con sei QR distinti (`P-ORD-5`),
i sei letti alla porta di cui uno in aereo (2.3, 3.2) e **un biglietto comprato
dopo lo scarico della lista ammesso con la radio spenta** (`P-DOOR-8`).

## Requisito per requisito

### BUY-01 — un ordine puo' contenere piu' biglietti · **CHIUSO**

- **Schema:** `supabase/migrations/20260905120000_ticket_orders.sql:252` —
  `public.ticket_orders`, con `sumup_checkout_id UNIQUE NOT NULL` come idempotenza
  del pagamento; `tickets.order_id`, `holder_label`, `issued_via`.
- **Emissione in una transazione:**
  `supabase/migrations/20260905120100_reserve_ticket_order.sql:26` —
  `reserve_ticket_order(uuid, text)`, `FOR UPDATE` sulla riga dell'ordine (`:58`)
  che serializza due consegne; ripetibile per costruzione (`:81`, rilegge i
  biglietti gia' emessi ordinati per etichetta).
- **Chiamata:** `src/app/api/webhooks/sumup/route.ts:499` — il ramo
  `ticket_orders` del webhook, dopo `getCheckout` (`:125`, *never trust webhook
  body*).
- **Superficie:** `src/app/(public)/events/[slug]/page.tsx:158` — `userTickets`
  al plurale; `.maybeSingle()` rimosso (`:564`, `:650`).
- **Osservato:** `P-RES-1` — ordine da 6 → 6 uuid, etichette «1 di 6»…«6 di 6»,
  richiamata: gli **stessi** 6. `P-RES-2` — 10,00 su 3 → `3.34 + 3.33 + 3.33`,
  esatti. `P-WH-3` (la corsa vera) — due consegne simultanee sull'ordine
  `pending`: biglietti 0 → **6**, non 12, una sola mail. `P-WH-1` (N=6) con
  6,00 € veri.

### BUY-02 — tetto 6 di default, modificabile per serata · **CHIUSO**

- **Colonna:** `20260905120000_ticket_orders.sql:252` —
  `event_parties.max_tickets_per_order integer NOT NULL DEFAULT 6`.
- **Dove e' autoritativo:** `20260905120100_reserve_ticket_order.sql:109-134` —
  il tetto e' controllato **dentro** la RPC, non solo nella UI; `:142-149` sei
  richieste su due posti falliscono tutte insieme.
- **Preventivo lato server:** `src/lib/tickets/order-quote.ts:1` (`server-only`),
  `:310` legge `max_tickets_per_order`, `:349` lo applica.
- **UI ospite:** `src/app/(public)/events/[slug]/TierSelection.tsx:601` — *«Up
  to {cap} per order — not per person.»*
- **UI organizer:** `src/components/events/EventForm.tsx:1289-1295` — «Tickets
  per order», segnaposto «Leave empty for the default (6)».
- **Osservato:** `P-RES-3` — ordine da 7 su tetto 6 → `P0001`, 0 righe.
  `P-RES-4` — tier con 2 posti, ordine da 6 → `P0001`, **0** righe, non 2.
  `P-UI-2` — selettore `1…6`, frase esatta. `P-UI-5` — tetto scritto a 4,
  salvato, riletto 4 anche dal catalogo; svuotato → resta 4. `P-BUY-2` —
  opzione 7 iniettata nel select → rifiuto leggibile, 0 righe.
- **Difetto residuo, non bloccante:** `P-UI-6` — lo zero e' rifiutato ma la
  frase viaggia in un `throw` (`src/app/(admin)/admin/events/actions.ts:532`)
  che Next spoglia in produzione: l'organizer vede l'errore generico. Il tetto
  resta 6. Voce aperta nel bilancio di `49-ESITI.md`.

### BUY-03 — l'acquisto non richiede un account · **CHIUSO**

- **Azione:** `src/app/(public)/events/[slug]/guest-purchase-actions.ts:191` —
  `purchaseTicketsGuest`: una mail e una quantita', nessuna sessione; venti cause
  di rifiuto **come valore**, mai `throw` (decisione registrata in `STATE.md`).
- **Identita' al pagamento, non al carrello:** `ticket_orders.user_id` nullabile
  (`49-01-SUMMARY.md`); il webhook conia l'identita' **dopo** `getCheckout`
  (`src/app/api/webhooks/sumup/route.ts:125`, `:355-382`).
- **La RPC non e' chiamabile con la chiave anonima:**
  `supabase/migrations/20260905150000_reserve_ticket_service_only.sql:47-50`.
- **Osservato:** `P-UI-1` — senza sessione si apre il pannello carta del
  fornitore, nessun rimbalzo a `/register`. `P-BUY-1` — riga `pending` con
  `user_id` **null**, mail normalizzata, `checkout_reference` = id dell'ordine,
  descrizione **senza indirizzo**. `P-BUY-4` — `auth.users` 4 → 4 dopo un
  checkout non pagato. `P-WH-1` (acquisto 1, 1,00 € vero) — identita' 4 → **5**
  su `auth.users` e `profiles`, ordine `completed`, un biglietto
  `issued_via = guest_checkout`. `P-BUY-5` — serata messa in bozza dopo
  l'apertura della pagina → rifiuto, 0 righe.
- **Apple Pay:** *non conclusiva* sul dominio del laboratorio, che non e'
  registrato presso SumUp. Da rifare sul dominio di produzione al primo tier in
  vendita (sesta voce del runbook).

### BUY-04 — i biglietti si ritrovano senza login, dalla credenziale e dalla mail · **PARZIALE**

**Dalla credenziale — chiuso.**

- `src/app/(public)/tickets/order/[token]/page.tsx:4` — firma verificata con
  `verifyTicketToken`; `:40` il rifiuto e' `notFound()` senza distinguere
  «inesistente» da «firma sbagliata»; `:191-192` i biglietti letti per
  `order_id`; `:246` ordinati per etichetta; `:58` **nessun predicato di venue**
  su questa superficie.
- Il gate delle superfici venue conosce la terza superficie:
  `scripts/verify-conversion.mjs:1598` (`/tickets/order/[token]` in
  `FOCUS_ROUTES`), `scripts/conversion-manifest.mjs:1067`.
- **Osservato:** `P-ORD-1` — link firmato aperto **senza sessione**, un QR,
  nessuna sede, nemmeno la parola «venue». `P-ORD-2` — firma alterata → 404,
  ordine inesistente con firma valida → 404, stesso `digest`. `P-ORD-3` — due
  user agent, stesso contenuto. `P-UI-4`/`P-ORD-5` — sei riquadri, sei QR con
  md5 diversi, in ordine numerico. 1.3/5.1 (screenshot del proprietario) — al
  ritorno dal pagamento, **prima** della mail, QR e link stabile.

**Dalla mail — il codice c'e', la superficie no.**

- `src/app/(public)/events/[slug]/guest-purchase-actions.ts:451` —
  `resendOrderTickets`, con la risposta neutra che non rivela se un indirizzo
  esiste. **Un solo riferimento in `src/`: la definizione.** Nessun componente
  la chiama (`P-ORD-4`, misurato con `/usr/bin/grep`).
- **Conseguenza:** oggi il requisito regge sul solo link nella mail e sulla
  schermata di ritorno. Chi perde la mail non ha una strada. E' il quarto
  difetto nell'ordine di costo di `49-ESITI.md`.

### BUY-05 — la credenziale della porta smette di nascere da un `random()` non crittografico · **CHIUSO**

- **Bersaglio corretto il 2026-09-05** (`ROADMAP.md`, box sotto BUY-05): non
  `src/utils/qr.ts:49`, che era codice morto, ma `membership_code` coniato dal
  `random()` di plpgsql in `handle_new_user`.
- `supabase/migrations/20260905130000_membership_code_crypto.sql:58` —
  `extensions.gen_random_bytes(10)`, CSPRNG di OpenSSL; `:72` `search_path = ''`
  fissato sulla `SECURITY DEFINER`; ritentativo sulla sola
  `profiles_membership_code_key`, ogni altra `unique_violation` rilanciata.
- `src/utils/qr.ts:46-49` — la funzione morta e' rimossa, con la lapide che
  dice perche' non va rimessa.
- **Osservato:** `P-CODE-1` — profilo nuovo → codice lungo 14, `RSN-` + 10
  nell'alfabeto dichiarato. `P-CODE-3` — referral: `approved`, `approved_via
  referral`, codice lungo 14. `P-CODE-2` con il master — il codice nuovo e'
  **riconosciuto** alla porta (`door_scan_events`, `subject_type = membership`,
  `recorded`).
- **Non riproducibile in laboratorio:** `P-CODE-5` — i quattro codici
  preesistenti sono di produzione e **non si rigenerano** (`D-49-01`): il
  difetto si chiude solo in avanti, ed e' dichiarato.

## Cio' che la fase ha trovato e riparato lo stesso giorno (commit `45be363`)

Tre fallimenti veri, nessuno dedotto, tutti riparati e ri-percorsi sul
laboratorio; uno applicato anche in produzione sotto la seconda autorizzazione
(`49-AUTHORISATION.md`, esaurita).

| Difetto | Dove | Ri-osservato |
|---|---|---|
| «Payment failed — Try again» su un pagamento riuscito senza biglietti (`P-WH-4` lato ospite) | `src/app/(public)/payment/callback/actions.ts:162-183` riverifica il checkout; `page.tsx:195-197` «We received your payment — your tickets were not issued. **Do not pay again.**»; `:218` il caso `UNCONFIRMED` | acquisto 4 del proprietario, screenshot 13:45: schermata giusta, «Try again» assente |
| chi e' in guest list non puo' creare un account (`P-CODE-4`, anche in produzione) | `supabase/migrations/20260908120000_guest_list_update_after_profile.sql:108` l'`INSERT` del profilo, `:136` l'`UPDATE` della voce **dopo** | `P-CODE-4` ripetuto: passa; produzione applicata alle 11:14:36Z, riletta dal catalogo |
| lo staff assegnato non ammette dal codice membership (`P-CODE-2`) | `src/app/api/membership/verify/route.ts:155-162` — la guardia riceve la serata, ruolo **oppure** assegnazione | sessione di `door@`: `200`, `valid: true`, `recorded`, attribuito a `door@` |

## L'ordine pagato senza biglietti ha uno strumento (commit `c5db820`, `7d55194`, `d090bca`)

- **Pulsante:** `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx:758`
  «Retry issuing» → `src/app/(admin)/admin/events/[id]/tickets/actions.ts:557` →
  `src/lib/tickets/replay-order-delivery.ts:52` — rilegge **PAID** su SumUp
  (`:27`), rifiuta se l'ordine ha gia' biglietti (`:44`), rimette `pending` con
  `.eq("status","failed")` (`:31`) e rigioca il webhook: **nessuna seconda
  strada del denaro**.
- **Cron:** `src/app/api/cron/retry-failed-orders/route.ts:37`, `vercel.json:28`
  alle 07:15 UTC; salta `identity_email_missing` (`:72`), finestra di quiete 10
  minuti (`:44`).
- **Avviso:** `src/lib/tickets/organizer-alert.ts:38` — verso
  `ORGANIZER_ALERT_EMAIL`, e se la variabile manca lo **dice** (`:51`), non tace.
- **Osservato:** ordine `failed` con biglietti → rifiutato, 6 → 6; ordine
  abbandonato → rifiutato; cron sul laboratorio `considered 2, checkoutNotPaid 1,
  other 1`; **acquisto 4** (1,00 € vero): pulsante premuto dal proprietario →
  `completed`, 1 biglietto, 1 mail; **acquisto 5**: avviso a `info@` alle
  12:00:40Z, **uno** anche dopo il rigioco.

## I due checkpoint umani — chiusi dall'evidenza, non marcati

- **`49-09` task 3, sei passi** (`49-09-SUMMARY.md` §10) → `P-REV-SEQ-1` in
  `49-ESITI.md`: **sei su sei osservati** il 2026-09-08 — 4.1 acquisto sulla
  segreta non rivelata senza indirizzo in nessuna superficie; 4.2 rivelazione
  manuale (dopo il rifiuto leggibile per nome mancante); 4.3 secondo acquisto →
  biglietti **e** indirizzo; 4.4 cron rilanciato → `parties 0`, consegne per
  destinatario 1 e 1; 4.5 guardia identica; 4.6 prenotazione e biglietto di
  evento creati dopo → **zero** mail. Restrizione in
  `src/lib/venue-reveal/reveal-party-venue.ts:323`, `:411-435`.
- **`49-11` task 2, le cinque procedure** (`49-11-SUMMARY.md`) → 46 prove su
  52 percorse, esiti con data e ruolo in `49-ESITI.md`. Le tre «prima del primo
  listing pubblico» passano tutte.

## Anti-pattern cercati

- `TODO|FIXME|XXX|stub|mock` su `src/lib/tickets`, `src/app/(public)/tickets`,
  `src/app/(public)/payment`, il webhook, il cron di rigioco, il template della
  mail, la pagina della serata e le sette migration di settembre: **0
  occorrenze** (`/usr/bin/grep`, 2026-09-08).
- `Math.random` nel percorso della credenziale: rimosso, lapide in
  `src/utils/qr.ts:46`.
- Un `throw` con messaggio destinato all'utente: **uno**,
  `src/app/(admin)/admin/events/actions.ts:532` (`P-UI-6`). E' l'unico punto
  della fase dove una causa distinta arriva collassata, e sta nella UI
  dell'organizer, non in quella dell'ospite.
- `error_message` non ripulito alla chiusura di un ordine rigiocato:
  cosmetico oggi (la sezione «address never sent» filtra sulle cause
  `reveal_*`), annotato in `49-ESITI.md`.

## Cio' che resta aperto, dichiarato

| Voce | Perche' resta | Dove e' scritta |
|---|---|---|
| «Rimandami i biglietti» senza superficie (`P-ORD-4`) | l'azione esiste, nessun componente la chiama | qui, BUY-04 |
| La frase del tetto a zero (`P-UI-6`) | `throw` spogliato da Next | `49-ESITI.md` bilancio |
| Il «gia' registrato» chiama il biglietto «Unknown» (`P-DOOR-4` a schermo) | etichetta del riquadro viola, il server risponde giusto | `deferred-items.md`, `D-49-10-DEF-10` |
| Apple Pay sul dominio di produzione | non verificabile sul laboratorio | runbook, sesta voce |
| Sei prove non eseguibili in laboratorio | `P-REV-MUT-1`, `P-DOOR-7`, `P-CODE-5`, `P-BUY-3`, `P-ORD-4`, `P-MAIL-6` — ciascuna con la causa | `49-ESITI.md` |
| Biglietti anche senza identita' (la terza strada) | specifica di fase, quattro decisioni del proprietario | `49-BEARER-WITHOUT-IDENTITY.md` |
| Dieci voci differite | `D-49-01-DEF-01` … `D-49-10-DEF-10` | `deferred-items.md` |

**Fatti da sapere, non difetti:** la mail da sei biglietti e' finita in
Promozioni su Gmail; nell'app Gmail il QR arriva come allegato; la ricevuta SumUp
porta ragione sociale e indirizzo legale del merchant; il riquadro «member list
NOT refreshed» compare anche online.

## Gate di verifica dichiarati

- `npm run build` verde su ogni commit della fase (typecheck, non comportamento).
- `verify:persona` 7/7 e controllo F verde al deploy del 2026-09-07.
- **Nessuna scrittura in produzione fuori dalle due autorizzazioni datate**, sette
  migration in tutto, righe di dato mosse: **0** (`49-AUTHORISATION.md`).
- Il laboratorio resta com'e', con cinque ordini veri e tredici scansioni: e' il
  materiale che questo file cita.
