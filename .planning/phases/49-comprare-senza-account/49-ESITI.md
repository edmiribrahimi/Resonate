---
phase: 49-comprare-senza-account
document: esiti delle 52 prove del runbook
started: 2026-09-08
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), MAI la produzione
status: in corso
---

# Fase 49 — Gli esiti, percorrendo

> Ogni riga porta la data, chi ha eseguito (ruolo o «agente»), e cio' che si e'
> **osservato**, non cio' che ci si aspettava. Un passo non eseguito e' scritto
> non eseguito, con la ragione. Nessun esito e' dedotto dal codice: tutti sono
> misurati contro il laboratorio, con lo strumento indicato.
>
> **Strumenti:** SQL via Management API sul ref del laboratorio (rifiuto sulla
> produzione in prima riga), PostgREST/GoTrue con sessioni reali, browser
> headless via CDP sul dominio `lab.resonatemotion.com` (build di produzione),
> API SumUp in sola lettura.

## Eseguite dall'agente — 2026-09-08

| Sigla | Esito | Osservato |
|---|---|---|
| `P-RES-1` | **PASSA** | ordine da 6 → 6 uuid, `holder_label` «1 di 6»…«6 di 6», `status = completed`; richiamata: gli **stessi** 6 uuid, conteggio ancora 6 |
| `P-RES-2` | **PASSA** | `total_amount 10.00`, `quantity 3` → importi `3.34 + 3.33 + 3.33 = 10.00` esatti |
| `P-RES-3` | **PASSA** | ordine da 7 su tetto 6 → `P0001` «chiede 7 biglietti, il tetto per ordine…», **0 righe** |
| `P-RES-4` | **PASSA** | tier con 2 posti, ordine da 6 → `P0001` «il tier ha 2 posti liberi, l'ordine ne chiede 6», **0 righe** (non 2) |
| `P-RES-5` | **PASSA** | `reserve_ticket` (8 argomenti, cast espliciti) con il master: prima chiamata riuscita, seconda `P0001` «already has a ticket». *Nota di metodo:* chiamata a 7 argomenti e' ambigua (`42725`) per il default dell'ottavo; con il membro seminato fallisce gia' la prima perche' ha un biglietto |
| `P-MAIL-1` | **PASSA** | `ticket_order_confirmation` inserita; `ticket_order_confirmatio` → `23514 check_violation` |
| `P-CODE-1` | **PASSA** | profilo nuovo via admin API → `membership_code` lungo **14**, `RSN-` + 10 dentro `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; utente rimosso per id |
| `P-VENUE-2` | **PASSA** | `venue_for_parties(p_party_ids)` con sessione **membro approvato senza biglietto** sulla segreta → `[]`; membro pending → `[]`; sulla NON segreta entrambi ricevono la riga. Il **master** riceve la riga anche sulla segreta: e' il **ramo 2** (`staff.manage`), dichiarato nel commento della funzione, non un ramo che apre su qualcosa che non e' un biglietto |
| `P-UI-7` | **PASSA** | pagina della segreta senza sessione: nessun indirizzo, nessun nome di sede, «Secret Venue», titolo `Lab Secret Night` |
| `P-UI-2` | **PASSA** | selettore `1,2,3,4,5,6`, frase esatta *«Up to 6 per order — not per person.»* |
| `P-UI-3` / `P-BUY-6` | **PASSA** | build di produzione (dominio). Vuota: *«Enter the email where your tickets should go. Nothing was charged.»* Malformata: *«That email does not look like an email, so your tickets would have nowhere to go…»* — **due frasi diverse** |
| `P-UI-1` | **PASSA** | senza sessione, tier scelto, quantita' 2: si apre il pannello carta del fornitore («Complete Payment · Paga con Carta…»); nessun rimbalzo a `/register` |
| `P-BUY-1` | **PASSA** | una riga `pending`, `user_id` **null**, `Lab-Buy1@Lab.Invalid` → `lab-buy1@lab.invalid`, `quantity 2`, `total 2.00` = 2 × `1.00` di catalogo; SumUp (GET, sola lettura): `checkout_reference` = **id dell'ordine**, `description` «Lab Secret Night - Lab Secret x2» **senza indirizzo** (passo 1.2 della procedura 1), `return_url` sul webhook del laboratorio |
| `P-BUY-4` | **PASSA** | `auth.users` 4 → 4, `profiles` 4 → 4 dopo una chiamata riuscita non seguita da pagamento |
| `P-BUY-2` | **PASSA** | opzione 7 iniettata nel select controllato → *«…One order may hold up to 6 tickets for this night — that is a limit per order, not per person.»*, **0 righe nuove**, nessun widget |
| `P-BUY-5` | **PASSA** | serata messa in bozza **dopo** l'apertura della pagina → *«Tickets for this night are not on sale. Nothing was charged.»*, **0 righe**; ripubblicata |
| `P-WH-5` | **PASSA** | ordine `pending` retrodatato a −40 min: sulla pagina organizer compare sotto *Orders without tickets* con la frase *«Checkout never confirmed, 1 ticket. We do not know whether it was paid — an abandoned cart looks exactly like this…»*, distinta da un fallimento |
| `P-UI-5` | **PASSA** | scritto 4, salvato, riaperto: **4** (anche nel catalogo). Svuotato e salvato: ancora **4** |
| `P-UI-6` | **FALLISCE** | con il `min=1` del browser lo zero non parte nemmeno. Scavalcato il vincolo HTML, lo zero arriva al server: il catalogo lo **rifiuta** (resta 6), ma l'organizer vede *«An error occurred in the Server Components render. The specific message is omitted in production builds…»* — la frase «Tickets per order must be at least 1…» esiste in `admin/events/actions.ts:532` ma viaggia in un `throw`, che Next spoglia in produzione. **Il rifiuto e' giusto, la frase non arriva.** Non e' un messaggio grezzo di Postgres: e' un messaggio grezzo di Next |
| `P-ORD-2` | **PASSA** | token valido dell'ordine pending → 200 «Il pagamento e' ancora in corso»; **firma alterata → 404**; **ordine inesistente con firma valida → 404**; token senza punto → 404. I due 404 hanno lo stesso `digest` e lo stesso contenuto: i 43 byte di differenza sono il taglio dei chunk di streaming di Next, non un'informazione |
| `P-CODE-3` | **PASSA** | utente con `referral_code` = codice del membro approvato → `status approved`, `approved_via referral`, `referred_by` = il membro; codice lungo 14. Eseguito via admin API: il trigger e' lo stesso di `/register`, e Supabase non spedisce conferme a domini di laboratorio |
| `P-CODE-4` | **FALLISCE — e in produzione e' uguale** | voce `invited` in guest list su `Lab Night`, poi utente con quella mail: la creazione e' **rifiutata dal database**, `23503` su `guest_list_entries_profile_id_fkey`. Il trigger aggiorna la voce con `profile_id = new.id` (riga 151) **prima** di inserire il profilo (riga 199), e l'ordine e' identico dalla versione di marzo. Confrontati in sola lettura: produzione e laboratorio hanno la **stessa** chiave esterna verso `profiles`, non differibile, e lo **stesso** corpo del trigger (md5 identico, `UPDATE` a 1222, `INSERT` a 3191). **Conseguenza in produzione:** chi ha la mail in una guest list `pending`/`invited` non puo' creare un account — ne' da `/register` ne' per creazione in-app — perche' l'inserimento in `auth.users` viene annullato dal trigger. La via «invito da guest list» con `guest_list_event_id` nei metadati **non** passa da questo ramo. Correzione candidata, non applicata: spostare l'`UPDATE` dopo l'`INSERT` del profilo. E' accesso: decisione del proprietario, e la fase 50 toglie le iscrizioni |
| `P-ORD-4` | **NON ESEGUIBILE — l'azione non ha una superficie** | `resendOrderTickets` e' definita in `guest-purchase-actions.ts:451` e **nessun componente la chiama** (misurato con `/usr/bin/grep` su `src/`: un solo riferimento, la definizione). La risposta neutra esiste nel codice (*«If that address has tickets with us, we have just sent them again…»*) ma nessun ospite puo' raggiungerla. **BUY-04 «i biglietti si ritrovano senza login» oggi regge sul solo link nella mail.** |

## Dopo l'acquisto 1 del proprietario — 2026-09-08, 09:45 UTC, 1,00 € su `Lab Secret Night`

| Sigla | Esito | Osservato |
|---|---|---|
| `P-WH-1` | **PASSA** | ordine `completed`, `sumup_transaction_code` valorizzato; **1** biglietto `issued_via = guest_checkout`, `holder_label` «1 di 1», `amount_paid 1.00`, stesso `user_id` dell'ordine; identita' in `auth.users` (confermata) **e** in `profiles` (`member`/`approved`, codice lungo 14); identita' 4 → **5** su entrambe le tabelle; SumUp `PAID`, transazione `SUCCESSFUL` |
| `P-MAIL-4` | **PASSA** | **una** riga in `email_deliveries`, `ticket_order_confirmation`, `outcome unverified`, `provider_message_id` presente, `check_attempts 0` |
| `P-ORD-1` | **PASSA** | link firmato aperto **senza sessione**: «Il tuo biglietto», **un** riquadro QR, «Biglietto 1 di 1», blocco «Completa il tuo account»; **nessuna sede, nessun indirizzo**, nemmeno la parola «venue» |
| `P-ORD-3` | **PASSA** | stesso link da due user agent diversi: 200 e stesso contenuto |
| 1.2 | **PASSA** | descrizione dell'articolo su SumUp: «Lab Secret Night - Lab Secret», senza indirizzo |
| `P-WH-2` | **PASSA** | webhook rigiocato a mano con lo stesso `id` di checkout → `{"received":true}`; biglietti 1 → 1, righe di posta 1 → 1, identita' 5 → 5, ordine `completed` |
| `P-WH-3` | **PASSA sul ramo idempotente; la corsa NON esercitata** | due consegne simultanee sullo stesso checkout, entrambe 200, conteggi invariati. **Ma l'ordine era gia' `completed`**: la corsa che la prova vuole misurare — due consegne mentre l'ordine e' ancora `pending`, N e non 2N — non si puo' esercitare quando SumUp consegna da solo per primo. Si esercita solo consegnando a mano contro `localhost` (`dev:lab`), strada non scelta |
| `P-MAIL-5` | **PASSA** | conseguenza di `P-WH-2`: la seconda chiamata dell'invio non produce una seconda riga di registro ne' una seconda mail |
| `P-VENUE-1` (prima) | **PASSA** | sessione dell'acquirente (password impostata in laboratorio), serata `venue_secret`, `venue_reveal_on_purchase = false`, non rivelata → `[]` |

### Osservato dal proprietario — screenshot delle 11:44–11:46 (iPhone, Safari in navigazione privata, app Gmail)

| Passo | Esito | Osservato |
|---|---|---|
| 1.3 / 5.1 | **PASSA** | al ritorno dal pagamento, **prima** della mail: «Il tuo biglietto», il link stabile dell'ordine, QR «Biglietto 1 di 1», «Completa il tuo account», «Ho gia' una password», «Vai alla serata». **Nessun indirizzo** |
| 1.5 / `P-MAIL-2` / `P-MAIL-3` | **PASSA, con una nota** | oggetto «Il tuo biglietto per Lab Secret Night»; «Ciao edmir.ibrahimi, il pagamento e' andato a buon fine»; «Lab Secret Night - Lab Secret · Monday, 21 September 2026 · 22:00»; «Biglietto 1 di 1»; link «Apri il biglietto 1 di 1»; blocco e pulsante «Completa il tuo account». **Nessun indirizzo.** *Nota:* nell'app Gmail il riquadro inline mostra il testo alternativo «Codice del biglietto 1 di 1» e il QR compare **come allegato in fondo alla mail**, non nel corpo: il codice arriva, ma chi non scorre fino agli allegati vede un riquadro vuoto |
| 6ª voce — Apple Pay | **NON COMPARE — non conclusiva sul dominio del laboratorio** | pannello SumUp su iPhone Safari: VISA · Mastercard · AmEx, «Paga con Carta di credito/debito», nessun pulsante Apple Pay. **Ma `lab.resonatemotion.com` non e' registrato per Apple Pay presso SumUp** (lo e' il dominio di produzione): la prova va rifatta sul dominio di produzione al primo tier in vendita, come il runbook gia' dice |
| 1.6 — ricevuta SumUp | **in attesa** | da trascrivere alla lettera dal proprietario |
| 1.6 — statement della carta | **PASSA (lato banca)** | nell'app della carta: «Resonate −1 €», stato pending fino al 17 settembre se non reclamato dal merchant. Solo il nome del merchant: nessun indirizzo, nessun nome di serata. La ricevuta SumUp come mail resta da vedere |

### La rivelazione manuale — passo 4.2, 2026-09-08 09:52 UTC, come master

| Passo | Esito | Osservato |
|---|---|---|
| 4.2, primo tentativo | **RIFIUTATO, leggibilmente** | il dialogo dice «send the address of Lab Venue to **1 person**. This does not come back», poi al clic: *«Nothing was sent. This act is written down with the full name of whoever performs it, and this account's profile carries no full name. An act attributed to nobody is not an act. Put a full name on the profile, then try again.»* Il master seminato non aveva nome. E' la guardia della fase 37 che fa il suo mestiere, e il conteggio «1 person» e' giusto |
| 4.2, secondo tentativo | **PASSA** | nome messo al master (solo laboratorio). A schermo: *«The night is revealed and its page has stopped hiding the address. 1 of 1. The address has left for everybody who was entitled to it at this moment.»* `venue_revealed_at` impostato; **una** consegna `venue_reveal` all'acquirente, `unverified`, 09:52:25. *Nota:* `venue_reveal_email_sent` resta `false` sulla serata: la rivelazione manuale scrive `venue_revealed_at` e l'atto, non quel flag |
| 4.2 — la mail | **PASSA** | il proprietario riceve «Venue Revealed: Lab Secret Night» alle 11:52: «Lab Secret Night · Monday, 21 September 2026 · 22:00», **«Lab Venue — Nowhere 0, Lab»**, «View Event». *Nota di copy:* saluta con «Hey Member» perche' il profilo nato dall'acquisto non ha un nome |
| `P-VENUE-1` (dopo) | **PASSA** | stessa sessione dell'acquirente, dopo la rivelazione → **una** riga: `name`, `address`, `google_maps_url` (null: il locale seminato non ne ha) |
| `P-VENUE-2` (dopo) | **PASSA** | membro approvato senza biglietto, dopo la rivelazione → ancora `[]`: il ramo 5 ristretto dalla fase 49 tiene |
| atto registrato | **PASSA** | `venue_reveal_acts`: `act = revealed`, `actor_name = Lab Master`, `recipients_intended = 1`, `party_label = Lab Secret Night — 2026-09-21` |
| 1.6 — ricevuta SumUp | **PASSA** | trascritta dal proprietario (PDF e pannello vendite, 2026-09-08 11:44 CEST, ricevuta `MCVM9P4A-87`): articolo **«1 x Lab Secret Night - Lab Secret»**, subtotale 1,00 €, IVA esente, Mastercard, transazione `TAAA6AKB6XQ` — la stessa scritta in `ticket_orders.sumup_transaction_code`. **Nessun indirizzo della serata, nessun nome di sede.** *Fatto da sapere, non un difetto del codice:* la ricevuta porta la ragione sociale del merchant e **il suo indirizzo legale**, presi dal profilo SumUp — li vede ogni acquirente. Fotografia di oggi: va rifatta a ogni cambio della descrizione dell'articolo o del profilo merchant |
